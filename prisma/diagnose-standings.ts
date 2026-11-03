/**
 * Script: Diagnose standings anomalies
 *
 * For every team that doesn't have exactly 82 counted games, shows:
 *  - Which games are counted (FINAL + winnerId)
 *  - Which games are FINAL but still have winnerId = null (and why)
 *  - Duplicate matchups (same two teams, close dates) → double-counted game
 *
 * Then attempts to fix:
 *  - Duplicate FINAL games: marks the one with the EARLIER date as CANCELLED
 *    (the rescheduled game on the later date is the real one)
 *  - FINAL games with no scores: tries ESPN summary endpoint (per-game API)
 *    which has data when the scoreboard API doesn't
 *
 * Usage:
 *   npm run db:diagnose-standings              → diagnose + auto-fix
 *   npm run db:diagnose-standings -- --dry-run → diagnose only, no writes
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

const EXPECTED_GAMES = 82;

// ESPN game summary endpoint — more reliable than scoreboard for old games
async function fetchGameSummary(espnId: string): Promise<{
  homeScore: number | null;
  awayScore: number | null;
  status: string;
} | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    const competition = data?.header?.competitions?.[0];
    if (!competition) return null;

    const status = competition.status?.type?.name ?? "unknown";
    const home = competition.competitors?.find((c: { homeAway: string }) => c.homeAway === "home");
    const away = competition.competitors?.find((c: { homeAway: string }) => c.homeAway === "away");

    const homeScore = home?.score != null ? parseInt(String(home.score)) : null;
    const awayScore = away?.score != null ? parseInt(String(away.score)) : null;

    return { homeScore, awayScore, status };
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");

  const season = seasonArg ?? getCurrentSeason();
  console.log(`\n🔍 Standings Diagnostic — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  // ── Fetch all teams ─────────────────────────────────────────
  const teams = await prisma.team.findMany({
    select: { id: true, abbreviation: true, conference: true, division: true },
    orderBy: { abbreviation: "asc" },
  });

  let totalFixed = 0;
  const anomalies: string[] = [];

  for (const team of teams) {
    // All regular season games for this team this season
    const allGames = await prisma.game.findMany({
      where: {
        season,
        seasonType: "Regular Season",
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: {
        homeTeam: { select: { abbreviation: true } },
        awayTeam: { select: { abbreviation: true } },
      },
      orderBy: { gameDate: "asc" },
    });

    const countedGames = allGames.filter(
      (g) => g.status === "FINAL" && g.winnerId !== null
    );
    const gp = countedGames.length;

    if (gp === EXPECTED_GAMES) continue; // ✅ Normal

    console.log(`\n⚠️  ${team.abbreviation}: ${gp} games counted (expected ${EXPECTED_GAMES})`);
    anomalies.push(team.abbreviation);

    if (gp > EXPECTED_GAMES) {
      // ── OVER-COUNT: look for duplicate matchups ───────────────
      console.log(`   → ${gp - EXPECTED_GAMES} extra game(s). Looking for duplicates...`);

      // Group games by opponent
      const byOpponent = new Map<string, typeof allGames>();
      for (const g of countedGames) {
        const oppId = g.homeTeamId === team.id ? g.awayTeamId : g.homeTeamId;
        const oppAbbr = g.homeTeamId === team.id
          ? g.awayTeam.abbreviation
          : g.homeTeam.abbreviation;
        if (!byOpponent.has(oppAbbr)) byOpponent.set(oppAbbr, []);
        byOpponent.get(oppAbbr)!.push(g);
      }

      for (const [oppAbbr, matchups] of byOpponent) {
        // NBA teams play each other at most 4 times in regular season (usually 2–4)
        // If we have 5+, something is wrong
        if (matchups.length > 4) {
          console.log(`   ❌ ${team.abbreviation} vs ${oppAbbr}: ${matchups.length} games (max is 4)`);
          for (const g of matchups) {
            console.log(`      ${g.gameDate.toISOString().slice(0, 10)}  ext:${g.externalId}  ${g.homeTeam.abbreviation}@${g.awayTeam.abbreviation}  ${g.homeScore}-${g.awayScore}`);
          }
        }
      }

      // Also check for same matchup within 3 days (clear duplicate)
      const duplicates: Array<{ keep: typeof allGames[0]; remove: typeof allGames[0] }> = [];

      for (const [, matchups] of byOpponent) {
        if (matchups.length < 2) continue;
        for (let i = 0; i < matchups.length - 1; i++) {
          const a = matchups[i];
          const b = matchups[i + 1];
          const daysDiff = Math.abs(
            (new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()) /
            (1000 * 60 * 60 * 24)
          );
          if (daysDiff <= 3) {
            // Likely a postponement + rescheduled pair — keep the later one
            duplicates.push({ keep: b, remove: a });
            console.log(`   🔁 Duplicate found: ${a.gameDate.toISOString().slice(0, 10)} AND ${b.gameDate.toISOString().slice(0, 10)}`);
            console.log(`      Will CANCEL the earlier: ${a.externalId} (${a.homeTeam.abbreviation}@${a.awayTeam.abbreviation})`);
          }
        }
      }

      if (!dryRun && duplicates.length > 0) {
        for (const { remove } of duplicates) {
          await prisma.game.update({
            where: { id: remove.id },
            data:  { status: "CANCELLED", winnerId: null },
          });
          console.log(`   ✅ Cancelled duplicate game ${remove.externalId}`);
          totalFixed++;
        }
      }
    }

    if (gp < EXPECTED_GAMES) {
      // ── UNDER-COUNT: find the missing games ──────────────────
      const missing = EXPECTED_GAMES - gp;
      console.log(`   → ${missing} game(s) missing from standings count.`);

      // Games that are FINAL but winnerId = null
      const finalNoWinner = allGames.filter(
        (g) => g.status === "FINAL" && g.winnerId === null
      );
      if (finalNoWinner.length > 0) {
        console.log(`   📋 FINAL games with winnerId=null: ${finalNoWinner.length}`);
        for (const g of finalNoWinner) {
          const hasScores = g.homeScore !== null && g.awayScore !== null;
          console.log(`      ${g.gameDate.toISOString().slice(0, 10)}  ext:${g.externalId}  scores:${hasScores ? `${g.homeScore}-${g.awayScore}` : "NONE"}`);

          if (hasScores && !dryRun) {
            // Fix from existing scores
            const winnerId = g.homeScore! > g.awayScore! ? g.homeTeamId : g.awayTeamId;
            await prisma.game.update({
              where: { id: g.id },
              data:  { winnerId },
            });
            console.log(`      ✅ Fixed winner from existing scores`);
            totalFixed++;
          } else if (!hasScores) {
            // Try ESPN game summary API (more reliable than scoreboard for old games)
            console.log(`      🌐 Fetching from ESPN summary API...`);
            const summary = await fetchGameSummary(g.externalId);
            await new Promise((r) => setTimeout(r, 400));

            if (summary && summary.homeScore !== null && summary.awayScore !== null
                && summary.homeScore !== summary.awayScore) {
              console.log(`      📊 ESPN: ${summary.awayScore}-${summary.homeScore} (${summary.status})`);
              const winnerId =
                summary.homeScore > summary.awayScore ? g.homeTeamId : g.awayTeamId;

              if (!dryRun) {
                await prisma.game.update({
                  where: { id: g.id },
                  data: {
                    status:     "FINAL",
                    homeScore:  summary.homeScore,
                    awayScore:  summary.awayScore,
                    winnerId,
                  },
                });
                console.log(`      ✅ Fixed from ESPN summary`);
                totalFixed++;
              }
            } else {
              console.log(`      ❌ ESPN summary had no score data for ${g.externalId}`);
            }
          }
        }
      }

      // Games still SCHEDULED/LIVE despite being in the past
      const stuck = allGames.filter(
        (g) => ["SCHEDULED", "LIVE"].includes(g.status) && g.gameDate < new Date()
      );
      if (stuck.length > 0) {
        console.log(`   ⏳ Still SCHEDULED/LIVE in past: ${stuck.length} — run backfill-standings to fix`);
        for (const g of stuck) {
          console.log(`      ${g.gameDate.toISOString().slice(0, 10)}  ext:${g.externalId}`);
        }
      }
    }
  }

  // ── Recalculate standings if we made fixes ──────────────────
  if (totalFixed > 0 && !dryRun) {
    const { recalculateAllStandings } = await import("../src/lib/standings-calculator");
    console.log(`\n\n🔄 Recalculating standings (${totalFixed} fix(es) applied)...\n`);
    await recalculateAllStandings();

    // Print updated summary
    const teamStats = await prisma.teamSeasonStats.findMany({
      where: { season },
      include: { team: { select: { abbreviation: true } } },
      orderBy: { winPct: "desc" },
    });

    console.log("\n📋 Updated standings:\n");
    for (const ts of teamStats) {
      const gp = ts.wins + ts.losses;
      const flag = gp !== 82 ? ` ⚠️  ← still ${gp}` : "";
      console.log(`  ${ts.team.abbreviation.padEnd(4)} ${String(ts.wins).padStart(2)}-${String(ts.losses).padEnd(2)}  GP: ${gp}${flag}`);
    }
  }

  if (anomalies.length === 0) {
    console.log("\n✅ All 30 teams have exactly 82 games. Standings are clean!\n");
  } else {
    console.log(`\n\n📋 Teams with anomalies: ${anomalies.join(", ")}`);
    if (dryRun) {
      console.log("   Run without --dry-run to apply fixes.\n");
    } else if (totalFixed === 0) {
      console.log("   ⚠️  Some games couldn't be fixed automatically (ESPN has no historical score data).");
      console.log("   These are likely cancelled/postponed games never rescheduled — you can safely ignore them,");
      console.log("   or manually investigate the externalIds shown above.\n");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
