/**
 * Script: Assign game numbers to playoff games
 *
 * For each PlayoffSeries, sorts its non-cancelled games by date (ascending)
 * and assigns gameNumber = 1, 2, 3, ... in chronological order.
 * Games already assigned the correct number are skipped.
 *
 * Also sets gameNumber in seed-espn.ts going forward (future games get
 * gameNumber at seed time via a separate helper).
 *
 * Usage:
 *   npm run db:fix-game-numbers                     → current season
 *   npm run db:fix-game-numbers -- --season=2025-26
 *   npm run db:fix-game-numbers -- --dry-run
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");
  const season    = seasonArg ?? getCurrentSeason();

  console.log(`\n🎮 Fix Game Numbers — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  const allSeries = await prisma.playoffSeries.findMany({
    where: { season },
    include: {
      team1: { select: { abbreviation: true } },
      team2: { select: { abbreviation: true } },
      games: {
        where:   { status: { not: "CANCELLED" } },
        orderBy: { gameDate: "asc" },
        select:  { id: true, gameDate: true, status: true, gameNumber: true },
      },
    },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
  });

  console.log(`  Found ${allSeries.length} series for season ${season}.\n`);

  let totalUpdated = 0;

  for (const series of allSeries) {
    const tag = `${series.team1.abbreviation} vs ${series.team2.abbreviation}`;
    const games = series.games;

    let seriesUpdates = 0;
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const expectedNumber = i + 1;

      if (game.gameNumber !== expectedNumber) {
        console.log(
          `  ${tag}  Game ${expectedNumber}: ${game.gameDate.toISOString().slice(0, 10)} [${game.status}]` +
          `  ${game.gameNumber ?? "null"} → ${expectedNumber}`
        );
        if (!dryRun) {
          await prisma.game.update({
            where: { id: game.id },
            data:  { gameNumber: expectedNumber },
          });
        }
        seriesUpdates++;
        totalUpdated++;
      }
    }

    if (seriesUpdates === 0) {
      console.log(`  ${tag}  ✅ already correct (${games.length} games)`);
    }
  }

  console.log(`\n✅ ${dryRun ? "Would update" : "Updated"} ${totalUpdated} game(s).\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
