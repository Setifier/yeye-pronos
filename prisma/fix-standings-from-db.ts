/**
 * Script: Fix standings using only data already in the DB
 *
 * Everything we need is already there — game scores, statuses, team IDs.
 * No ESPN API calls. Pure DB.
 *
 * Step 1 — Fix winnerId: for every FINAL game that has homeScore + awayScore
 *          but winnerId = null → derive and set winnerId from the existing scores.
 *
 * Step 2 — Detect real duplicates: look for teams with > 82 FINAL+winner games.
 *          For those teams, find which specific opponent appears too many times
 *          (> 4 matchups = impossible in a regular NBA season).
 *          Cancel the duplicate game that has the same home/away direction as
 *          another game played within 3 days (rescheduled postponement pattern).
 *
 * Step 3 — Recalculate TeamSeasonStats for all 30 teams.
 *
 * NOTE: Teams finishing with < 82 GP have genuinely unplayed games (postponed,
 *       never rescheduled). That is accepted — standings reflect real played games.
 *
 * Usage:
 *   npm run db:fix-standings              → apply all fixes
 *   npm run db:fix-standings -- --dry-run → diagnose only, no writes
 *   npm run db:fix-standings -- --season=2025-26
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";
import { recalculateAllStandings } from "../src/lib/standings-calculator";

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");

  const season = seasonArg ?? getCurrentSeason();

  console.log(`\n🏆 Fix Standings from DB — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  // ── Fetch all regular season games ──────────────────────────
  const allGames = await prisma.game.findMany({
    where: { season, seasonType: "Regular Season" },
    include: {
      homeTeam: { select: { id: true, abbreviation: true } },
      awayTeam: { select: { id: true, abbreviation: true } },
    },
    orderBy: { gameDate: "asc" },
  });

  const teams = await prisma.team.findMany({
    select: { id: true, abbreviation: true },
    orderBy: { abbreviation: "asc" },
  });

  // ── Global summary ───────────────────────────────────────────
  const finalGames      = allGames.filter((g) => g.status === "FINAL");
  const finalWithWinner = finalGames.filter((g) => g.winnerId !== null);
  const finalNoWinner   = finalGames.filter((g) => g.winnerId === null);
  const fixable         = finalNoWinner.filter(
    (g) => g.homeScore !== null && g.awayScore !== null && g.homeScore !== g.awayScore
  );
  const scheduledPast   = allGames.filter(
    (g) => ["SCHEDULED", "LIVE"].includes(g.status) && g.gameDate < new Date()
  );
  const postponed       = allGames.filter((g) => g.status === "POSTPONED");
  const cancelled       = allGames.filter((g) => g.status === "CANCELLED");

  console.log(`\n📊 Diagnosis\n`);
  console.log(`  Total regular season games in DB : ${allGames.length}`);
  console.log(`  FINAL                            : ${finalGames.length}`);
  console.log(`    ├─ with winnerId ✅             : ${finalWithWinner.length}`);
  console.log(`    ├─ no winnerId (fixable) ✅     : ${fixable.length}  ← will fix from scores`);
  console.log(`    └─ no winnerId (no scores) ⚠️   : ${finalNoWinner.length - fixable.length}`);
  console.log(`  SCHEDULED/LIVE in the past ⚠️    : ${scheduledPast.length}`);
  console.log(`  POSTPONED                        : ${postponed.length}`);
  console.log(`  CANCELLED                        : ${cancelled.length}`);

  if (scheduledPast.length > 0) {
    console.log(`\n  ⚠️  Never-finalized past games (no scores available):`);
    for (const g of scheduledPast) {
      console.log(`     ${g.gameDate.toISOString().slice(0, 10)}  ext:${g.externalId}  ${g.homeTeam.abbreviation} vs ${g.awayTeam.abbreviation}`);
    }
  }

  // ── Per-team GP count from current FINAL+winner data ────────
  type GameRow = typeof allGames[0];
  const teamGP = new Map<string, GameRow[]>();
  for (const team of teams) {
    teamGP.set(team.id, []);
  }
  for (const g of finalWithWinner) {
    teamGP.get(g.homeTeamId)?.push(g);
    teamGP.get(g.awayTeamId)?.push(g);
  }

  const overCount  = teams.filter((t) => (teamGP.get(t.id)?.length ?? 0) > 82);
  const underCount = teams.filter((t) => (teamGP.get(t.id)?.length ?? 0) < 82);

  console.log(`\n  Current GP counts:`);
  console.log(`    ✅ Teams with exactly 82 GP : ${teams.length - overCount.length - underCount.length}`);
  if (overCount.length > 0) {
    console.log(`    ❌ Teams with > 82 GP       : ${overCount.map((t) => `${t.abbreviation} (${teamGP.get(t.id)?.length})`).join(", ")}`);
  }
  if (underCount.length > 0) {
    console.log(`    ⚠️  Teams with < 82 GP       : ${underCount.map((t) => `${t.abbreviation} (${teamGP.get(t.id)?.length})`).join(", ")}`);
  }

  // ── Detect REAL duplicates: teams with > 82 counted games ───
  // For each over-count team: find which opponent appears > 4 times,
  // then among those games, find the one where the same home/away direction
  // appears twice within 3 days (postponed + rescheduled pattern).
  const toCancel: GameRow[] = [];

  for (const team of overCount) {
    const games = teamGP.get(team.id) ?? [];
    const extra  = games.length - 82;
    console.log(`\n  🔍 Investigating ${team.abbreviation} (${games.length} GP — ${extra} too many):`);

    // Group by opponent
    const byOpponent = new Map<string, GameRow[]>();
    for (const g of games) {
      const oppId   = g.homeTeamId === team.id ? g.awayTeamId : g.homeTeamId;
      const oppAbbr = g.homeTeamId === team.id
        ? g.awayTeam.abbreviation
        : g.homeTeam.abbreviation;
      if (!byOpponent.has(oppAbbr)) byOpponent.set(oppAbbr, []);
      byOpponent.get(oppAbbr)!.push(g);
    }

    // NBA max matchups per opponent in regular season = 4 (for division rivals)
    // 5+ = definitely wrong
    for (const [oppAbbr, matchups] of byOpponent) {
      if (matchups.length <= 4) continue;

      console.log(`     ❌ ${team.abbreviation} vs ${oppAbbr}: ${matchups.length} games (max is 4)`);
      for (const g of matchups) {
        console.log(
          `        ${g.gameDate.toISOString().slice(0, 10)}  ext:${g.externalId}` +
          `  ${g.homeTeam.abbreviation} ${g.homeScore ?? "?"}-${g.awayScore ?? "?"} ${g.awayTeam.abbreviation}`
        );
      }

      // Strategy: the direction (home/away) that appears more often has the duplicate.
      // Among those, cancel the EARLIEST game that is NOT part of a back-to-back
      // with an opposite-direction game (those are legitimate Christmas/consecutive pairs).
      const sorted = [...matchups].sort((a, b) => a.gameDate.getTime() - b.gameDate.getTime());

      // Count appearances per direction
      const dirA = sorted.filter((g) => g.homeTeamId === sorted[0].homeTeamId); // same as first
      const dirB = sorted.filter((g) => g.homeTeamId !== sorted[0].homeTeamId);
      const extraDir = dirA.length >= dirB.length ? dirA : dirB; // the direction with more games

      // Mark close pairs between DIFFERENT directions (back-to-back Christmas etc.) as protected
      const protectedIds = new Set<string>();
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const differentDirection = a.homeTeamId !== b.homeTeamId;
        const daysDiff = (b.gameDate.getTime() - a.gameDate.getTime()) / (1000 * 60 * 60 * 24);
        if (differentDirection && daysDiff <= 2) {
          protectedIds.add(a.id);
          protectedIds.add(b.id);
          console.log(`     🎄 Protecting back-to-back pair: ${a.gameDate.toISOString().slice(0, 10)} + ${b.gameDate.toISOString().slice(0, 10)}`);
        }
      }

      // Cancel the EARLIEST unprotected game from the over-represented direction
      const candidate = extraDir.find((g) => !protectedIds.has(g.id));
      if (candidate) {
        console.log(
          `     🔁 Cancel EARLIEST unprotected from over-represented direction: ext:${candidate.externalId}` +
          ` (${candidate.gameDate.toISOString().slice(0, 10)})  ${candidate.homeTeam.abbreviation} ${candidate.homeScore}-${candidate.awayScore} ${candidate.awayTeam.abbreviation}`
        );
        toCancel.push(candidate);
      } else {
        console.log(`     ⚠️  All games in the extra direction are protected — cannot auto-resolve. Manual check needed.`);
      }
    }
  }

  if (overCount.length === 0) {
    console.log(`\n  ✅ No team has more than 82 GP — no duplicates to cancel.`);
  } else if (toCancel.length === 0) {
    console.log(`\n  ⚠️  Over-count detected but couldn't auto-identify duplicates.`);
    console.log(`     Manual investigation of the games listed above is needed.`);
  }

  // ── Check non-FINAL past games for existing GamePlayerStats ──
  // If boxscores were seeded for a game, the stats are in DB even if
  // the game record is still SCHEDULED/POSTPONED.
  const nonFinalPast = allGames.filter(
    (g) =>
      g.status !== "FINAL" &&
      g.status !== "CANCELLED" &&
      g.gameDate < new Date()
  );

  type RecoverableGame = {
    game: typeof allGames[0];
    homeScore: number;
    awayScore: number;
  };
  const recoverableFromStats: RecoverableGame[] = [];

  if (nonFinalPast.length > 0) {
    console.log(`\n  🔎 Checking ${nonFinalPast.length} non-FINAL past game(s) for player stats in DB...`);
    for (const g of nonFinalPast) {
      const stats = await prisma.gamePlayerStats.findMany({
        where: { gameId: g.id },
        select: { teamId: true, points: true },
      });
      if (stats.length === 0) continue;

      const homePoints = stats
        .filter((s) => s.teamId === g.homeTeamId)
        .reduce((sum, s) => sum + s.points, 0);
      const awayPoints = stats
        .filter((s) => s.teamId === g.awayTeamId)
        .reduce((sum, s) => sum + s.points, 0);

      if (homePoints > 0 && awayPoints > 0 && homePoints !== awayPoints) {
        recoverableFromStats.push({ game: g, homeScore: homePoints, awayScore: awayPoints });
        console.log(
          `    ✅ ${g.gameDate.toISOString().slice(0, 10)}  ${g.homeTeam.abbreviation} ${homePoints}-${awayPoints} ${g.awayTeam.abbreviation}` +
          `  (${stats.length} player records)  status was: ${g.status}`
        );
      } else {
        console.log(
          `    ❌ ${g.gameDate.toISOString().slice(0, 10)}  ext:${g.externalId}` +
          `  ${g.homeTeam.abbreviation} vs ${g.awayTeam.abbreviation}  — no stats in DB`
        );
      }
    }

    if (recoverableFromStats.length > 0) {
      console.log(`\n  → ${recoverableFromStats.length} game(s) recoverable from player stats`);
    }
    if (recoverableFromStats.length < nonFinalPast.length) {
      const stillMissing = nonFinalPast.length - recoverableFromStats.length;
      console.log(`  → ${stillMissing} game(s) truly have no data in DB (genuinely unplayed or boxscores not seeded)`);
    }
  } else {
    console.log(`\n  ✅ No non-FINAL past games to check.`);
  }

  if (underCount.length > 0) {
    const notRecoverable = underCount.filter((t) => {
      const recovered = recoverableFromStats.filter(
        (r) => r.game.homeTeamId === t.id || r.game.awayTeamId === t.id
      ).length;
      const currentGP = teamGP.get(t.id)?.length ?? 0;
      return currentGP + recovered < 82;
    });
    if (notRecoverable.length > 0) {
      console.log(`\n  ⚠️  After recovery: ${notRecoverable.map((t) => t.abbreviation).join(", ")} will still be < 82 GP.`);
      console.log(`     These games have no player stats in DB — boxscores not seeded for those dates.`);
    }
  }

  if (dryRun) {
    console.log("\n⚠️  Dry run — no writes performed.\n");
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 1 — Fix winnerId where scores exist in DB
  // ══════════════════════════════════════════════════════════════
  if (fixable.length > 0) {
    console.log(`\n\n🔧 Step 1 — Fix winnerId from DB scores\n`);
    let step1Fixed = 0;
    for (const g of fixable) {
      const winnerId = g.homeScore! > g.awayScore! ? g.homeTeamId : g.awayTeamId;
      await prisma.game.update({ where: { id: g.id }, data: { winnerId } });
      process.stdout.write(
        `  ✅ ${g.gameDate.toISOString().slice(0, 10)}  ${g.homeTeam.abbreviation} ${g.homeScore}-${g.awayScore} ${g.awayTeam.abbreviation}  → winner fixed\n`
      );
      step1Fixed++;
    }
    console.log(`\n  Fixed ${step1Fixed} game(s).`);
  } else {
    console.log(`\n\n🔧 Step 1 — Fix winnerId: nothing to fix (all good ✅)\n`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 1.5 — Recover games from GamePlayerStats
  // ══════════════════════════════════════════════════════════════
  if (recoverableFromStats.length > 0) {
    console.log(`\n\n🔧 Step 1.5 — Recover ${recoverableFromStats.length} game(s) from player stats\n`);
    for (const { game: g, homeScore, awayScore } of recoverableFromStats) {
      const winnerId = homeScore > awayScore ? g.homeTeamId : g.awayTeamId;
      await prisma.game.update({
        where: { id: g.id },
        data: { status: "FINAL", homeScore, awayScore, winnerId },
      });
      process.stdout.write(
        `  ✅ ${g.gameDate.toISOString().slice(0, 10)}  ${g.homeTeam.abbreviation} ${homeScore}-${awayScore} ${g.awayTeam.abbreviation}  → FINAL + winner set\n`
      );
    }
    console.log(`\n  Recovered ${recoverableFromStats.length} game(s) from player stats.`);
  } else {
    console.log(`\n\n🔧 Step 1.5 — Recover from player stats: nothing to recover (✅)\n`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2 — Cancel confirmed duplicate games
  // ══════════════════════════════════════════════════════════════
  if (toCancel.length > 0) {
    console.log(`\n\n🔧 Step 2 — Cancel duplicate games\n`);
    for (const g of toCancel) {
      await prisma.game.update({
        where: { id: g.id },
        data:  { status: "CANCELLED", winnerId: null },
      });
      process.stdout.write(
        `  ✅ Cancelled ext:${g.externalId}  ${g.homeTeam.abbreviation} ${g.homeScore}-${g.awayScore} ${g.awayTeam.abbreviation}  ${g.gameDate.toISOString().slice(0, 10)}\n`
      );
    }
    console.log(`\n  Cancelled ${toCancel.length} duplicate game(s).`);
  } else {
    console.log(`\n\n🔧 Step 2 — Duplicate detection: nothing to cancel (✅)\n`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 3 — Recalculate all standings
  // ══════════════════════════════════════════════════════════════
  console.log(`\n\n🔄 Step 3 — Recalculating standings for all 30 teams...\n`);
  await recalculateAllStandings();

  // ── Print final standings ────────────────────────────────────
  const teamStats = await prisma.teamSeasonStats.findMany({
    where: { season },
    include: { team: { select: { abbreviation: true } } },
    orderBy: { winPct: "desc" },
  });

  console.log("\n📋 Final standings:\n");
  let anomalies = 0;
  for (const ts of teamStats) {
    const gp   = ts.wins + ts.losses;
    const flag = gp > 82 ? `  ❌ ${gp} GP` : gp < 82 ? `  ⚠️  ${gp} GP` : "";
    console.log(
      `  ${ts.team.abbreviation.padEnd(4)} ${String(ts.wins).padStart(2)}-${String(ts.losses).padEnd(2)}${flag}`
    );
    if (gp !== 82) anomalies++;
  }

  if (anomalies === 0) {
    console.log("\n✅ All 30 teams have exactly 82 games. Standings are perfect!\n");
  } else {
    const over  = teamStats.filter((ts) => ts.wins + ts.losses > 82);
    const under = teamStats.filter((ts) => ts.wins + ts.losses < 82);
    if (over.length > 0) {
      console.log(`\n❌ ${over.length} team(s) still > 82 GP — manual investigation needed.`);
    }
    if (under.length > 0) {
      console.log(`\nℹ️  ${under.length} team(s) with < 82 GP — unplayed games (normal for this season).\n`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
