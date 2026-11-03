/**
 * Script: Recalculate team standings and season stats
 *
 * Recomputes wins, losses, win%, home/away/conference/division records,
 * last 10, current streak, points per game, points allowed, and point
 * differential for every team — or a single team if --team is passed.
 *
 * Only regular-season games are counted (Play-In and Playoffs are excluded).
 *
 * Usage:
 *   npm run db:recalculate-standings                  → all 30 teams
 *   npm run db:recalculate-standings -- --team=GSW    → single team by abbreviation
 *   npm run db:recalculate-standings -- --season=2025-26
 */

import { prisma } from "../src/lib/prisma";
import { calculateStandings, recalculateAllStandings } from "../src/lib/standings-calculator";
import { updateStandingRanks } from "../src/lib/standings-ranking";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const args = process.argv.slice(2);
  const teamArg   = args.find((a) => a.startsWith("--team="))?.split("=")[1];
  const season    = args.find((a) => a.startsWith("--season="))?.split("=")[1] ?? getCurrentSeason();

  console.log(`\n🏆 Recalculate Team Standings — ${season}\n`);

  if (teamArg) {
    // Single team
    const team = await prisma.team.findFirst({
      where: { abbreviation: teamArg.toUpperCase() },
    });

    if (!team) {
      console.error(`❌ Team not found: ${teamArg}`);
      process.exit(1);
    }

    console.log(`📋 Recalculating standings for ${team.abbreviation}...\n`);
    await calculateStandings(team.id, season);
    await updateStandingRanks(season);
  } else {
    // All 30 teams (rangs conférence/division inclus)
    console.log("📋 Recalculating standings for all teams...\n");
    await recalculateAllStandings(season);
  }

  console.log("\n✅ Done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
