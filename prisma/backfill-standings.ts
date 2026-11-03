/**
 * Script: Backfill game statuses + recalculate standings
 *
 * Handles ALL reasons why standings can be wrong:
 *
 *  Step 0 — Diagnostic: count games per status and flag anomalies
 *  Step 1 — Fix FINAL games with null winnerId (recalculate from scores already in DB)
 *  Step 2 — Fetch ESPN for still-SCHEDULED/LIVE past games → set FINAL + scores + winnerId
 *  Step 3 — Recalculate TeamSeasonStats for all 30 teams
 *
 * Usage:
 *   npm run db:backfill-standings
 *   npm run db:backfill-standings -- --season=2025-26
 *   npm run db:backfill-standings -- --from=2025-10-21 --to=2026-04-14
 *   npm run db:backfill-standings -- --dry-run   (show diagnosis only, no writes)
 */

import { prisma } from "../src/lib/prisma";
import { getGamesByDate } from "../src/lib/espn";
import { getCurrentSeason } from "../src/types/season";
import { recalculateAllStandings } from "../src/lib/standings-calculator";

function mapGameStatus(
  statusName: string
): "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED" {
  const n = statusName.toUpperCase();
  if (n.includes("FINAL")) return "FINAL";
  if (n.includes("PROGRESS") || n.includes("LIVE") || n.includes("HALFTIME")) return "LIVE";
  if (n.includes("POSTPONED") || n.includes("PPD")) return "POSTPONED";
  if (n.includes("CANCELLED") || n.includes("CANCELED")) return "CANCELLED";
  return "SCHEDULED";
}

async function main() {
  const args = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const fromArg   = args.find((a) => a.startsWith("--from="))?.split("=")[1];
  const toArg     = args.find((a) => a.startsWith("--to="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");

  const season = seasonArg ?? getCurrentSeason();

  console.log(`\n🏆 Backfill Standings — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  const dateFilter = {
    ...(fromArg ? { gte: new Date(fromArg) } : undefined),
    ...(toArg   ? { lte: new Date(toArg)   } : undefined),
  };

  // ══════════════════════════════════════════════════════════════
  // STEP 0 — Diagnostic
  // ══════════════════════════════════════════════════════════════
  console.log("\n📊 Step 0 — Diagnosis\n");

  const allRegularGames = await prisma.game.findMany({
    where: {
      season,
      seasonType: "Regular Season",
      ...(Object.keys(dateFilter).length ? { gameDate: dateFilter } : {}),
    },
    select: {
      id: true,
      externalId: true,
      status: true,
      gameDate: true,
      homeScore: true,
      awayScore: true,
      winnerId: true,
      homeTeamId: true,
      awayTeamId: true,
    },
    orderBy: { gameDate: "asc" },
  });

  const total        = allRegularGames.length;
  const finalGames   = allRegularGames.filter((g) => g.status === "FINAL");
  const finalWithWinner   = finalGames.filter((g) => g.winnerId !== null);
  const finalNoWinner     = finalGames.filter((g) => g.winnerId === null);
  const finalNoWinnerWithScores = finalNoWinner.filter(
    (g) => g.homeScore !== null && g.awayScore !== null && g.homeScore !== g.awayScore
  );
  const finalNoScores = finalGames.filter(
    (g) => g.homeScore === null || g.awayScore === null
  );
  const scheduledPast = allRegularGames.filter(
    (g) => ["SCHEDULED", "LIVE"].includes(g.status) && g.gameDate < new Date()
  );
  const postponed   = allRegularGames.filter((g) => g.status === "POSTPONED");
  const cancelled   = allRegularGames.filter((g) => g.status === "CANCELLED");

  console.log(`  Total regular season games in DB : ${total}`);
  console.log(`  FINAL                            : ${finalGames.length}`);
  console.log(`    ├─ with winnerId ✅             : ${finalWithWinner.length}`);
  console.log(`    ├─ without winnerId (has scores): ${finalNoWinnerWithScores.length}  ← will be fixed`);
  console.log(`    └─ without winnerId (no scores) : ${finalNoWinner.length - finalNoWinnerWithScores.length}  ← need ESPN fetch`);
  console.log(`  SCHEDULED/LIVE (past)            : ${scheduledPast.length}  ← will fetch ESPN`);
  console.log(`  POSTPONED                        : ${postponed.length}`);
  console.log(`  CANCELLED                        : ${cancelled.length}`);
  console.log(`\n  ➜ Standings currently count      : ${finalWithWinner.length} games`);
  console.log(`  ➜ Expected after fix             : ~${finalWithWinner.length + finalNoWinnerWithScores.length + scheduledPast.length} games`);

  if (dryRun) {
    console.log("\n⚠️  Dry run — no writes performed.\n");
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 1 — Fix FINAL games where scores exist but winnerId = null
  // ══════════════════════════════════════════════════════════════
  console.log("\n\n🔧 Step 1 — Fix FINAL games with missing winnerId\n");

  let step1Fixed = 0;

  for (const game of finalNoWinnerWithScores) {
    const winnerId =
      game.homeScore! > game.awayScore!
        ? game.homeTeamId
        : game.awayTeamId;

    await prisma.game.update({
      where: { id: game.id },
      data:  { winnerId },
    });

    step1Fixed++;
    process.stdout.write(`  ✅ Fixed winner for game ${game.externalId}\n`);
  }

  if (step1Fixed === 0) {
    console.log("  ✅ No FINAL games with missing winnerId found.");
  } else {
    console.log(`\n  Fixed ${step1Fixed} game(s).`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2 — Fetch ESPN for SCHEDULED/LIVE past games
  // ══════════════════════════════════════════════════════════════
  console.log("\n\n📡 Step 2 — Fetch ESPN for unfinalized past games\n");

  const gamesToFetch = allRegularGames.filter(
    (g) => ["SCHEDULED", "LIVE"].includes(g.status) && g.gameDate < new Date()
  );

  if (gamesToFetch.length === 0) {
    console.log("  ✅ No SCHEDULED/LIVE past games to fetch.");
  } else {
    console.log(`  📋 ${gamesToFetch.length} game(s) to fetch from ESPN\n`);

    // Group by ESPN date (US Eastern)
    const dateMap = new Map<string, typeof gamesToFetch>();
    for (const game of gamesToFetch) {
      const espnDate = game.gameDate.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
      if (!dateMap.has(espnDate)) dateMap.set(espnDate, []);
      dateMap.get(espnDate)!.push(game);
    }

    let step2Updated = 0;
    let step2Finalized = 0;
    let step2Errors = 0;

    for (const [dateStr, gamesForDate] of dateMap) {
      const espnDateStr = dateStr.replace(/-/g, "");

      let espnGames;
      try {
        const response = await getGamesByDate(espnDateStr);
        espnGames = response.events;
      } catch (err) {
        console.error(`  ❌ ESPN fetch failed for ${dateStr}:`, err);
        step2Errors++;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const espnMap = new Map(espnGames.map((g) => [g.id, g]));

      for (const dbGame of gamesForDate) {
        const espnGame = espnMap.get(dbGame.externalId);
        if (!espnGame) {
          console.warn(`  ⚠️  Game ${dbGame.externalId} not found in ESPN for ${dateStr}`);
          continue;
        }

        const competition = espnGame.competitions[0];
        if (!competition) continue;

        const newStatus = mapGameStatus(competition.status.type.name);
        const homeComp  = competition.competitors.find((c) => c.homeAway === "home");
        const awayComp  = competition.competitors.find((c) => c.homeAway === "away");
        const homeScore = homeComp?.score ? parseInt(homeComp.score) : null;
        const awayScore = awayComp?.score ? parseInt(awayComp.score) : null;

        let winnerId: string | null = null;
        if (newStatus === "FINAL" && homeScore !== null && awayScore !== null && homeScore !== awayScore) {
          winnerId = homeScore > awayScore ? dbGame.homeTeamId : dbGame.awayTeamId;
        }

        await prisma.game.update({
          where: { id: dbGame.id },
          data:  { status: newStatus, homeScore, awayScore, winnerId },
        });

        step2Updated++;
        if (newStatus === "FINAL") step2Finalized++;

        process.stdout.write(
          `  ✅ ${dateStr}: ${dbGame.externalId} → ${newStatus}` +
          (homeScore !== null ? ` (${awayScore}-${homeScore})` : "") + "\n"
        );
      }

      // Throttle ESPN API
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`\n  ESPN fetched: ${step2Updated} updated, ${step2Finalized} finalized, ${step2Errors} date(s) failed`);
  }

  // ══════════════════════════════════════════════════════════════
  // POST-FIX DIAGNOSIS — Check if we still have issues
  // ══════════════════════════════════════════════════════════════
  const remainingIssues = await prisma.game.count({
    where: {
      season,
      seasonType: "Regular Season",
      status: "FINAL",
      winnerId: null,
      gameDate: { lt: new Date() },
    },
  });

  if (remainingIssues > 0) {
    console.log(`\n⚠️  ${remainingIssues} FINAL game(s) still have winnerId = null (ESPN had no scores).`);
    console.log("   These games will still be excluded from standings.");
    console.log("   Run with --dry-run to see detailed diagnosis.\n");
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 3 — Recalculate all standings
  // ══════════════════════════════════════════════════════════════
  console.log("\n🔄 Step 3 — Recalculating standings for all 30 teams...\n");
  await recalculateAllStandings();

  // Final count for each team
  const teamStats = await prisma.teamSeasonStats.findMany({
    where: { season },
    include: { team: { select: { abbreviation: true } } },
    orderBy: { winPct: "desc" },
  });

  if (teamStats.length > 0) {
    console.log("\n📋 Final standings summary:\n");
    for (const ts of teamStats) {
      const gp = ts.wins + ts.losses;
      const flag = gp < 78 ? " ⚠️ " : "";
      console.log(
        `  ${ts.team.abbreviation.padEnd(4)} ${String(ts.wins).padStart(2)}-${String(ts.losses).padEnd(2)}  GP: ${gp}${flag}`
      );
    }
    const undercount = teamStats.filter((ts) => ts.wins + ts.losses < 78);
    if (undercount.length > 0) {
      console.log(`\n⚠️  ${undercount.length} team(s) have fewer than 78 games — check if some games lack scores in ESPN.`);
    }
  }

  console.log("\n✅ Done.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
