/**
 * Script: Fix PlayoffSeries data for the current season
 *
 * Does four things:
 * 1. Sets round=1 and conference (East/West) for first-round series where round=null,
 *    inferring conference from the teams' own conference field.
 * 2. Recounts team1Wins / team2Wins from actual FINAL game results (safe recount).
 * 3. Marks series as COMPLETED if one team has 4 wins.
 * 4. Assigns game numbers to all playoff games in the series.
 *
 * Usage:
 *   npm run db:fix-playoff-series                     → current season
 *   npm run db:fix-playoff-series -- --season=2025-26
 *   npm run db:fix-playoff-series -- --dry-run
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");
  const season    = seasonArg ?? getCurrentSeason();

  console.log(`\n🔧 Fix Playoff Series — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  const allSeries = await prisma.playoffSeries.findMany({
    where: { season },
    include: {
      team1: { select: { id: true, abbreviation: true, conference: true } },
      team2: { select: { id: true, abbreviation: true, conference: true } },
      games: {
        where:   { status: { not: "CANCELLED" } },
        orderBy: { gameDate: "asc" },
        select:  { id: true, winnerId: true, status: true, gameDate: true, gameNumber: true },
      },
    },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
  });

  console.log(`  Found ${allSeries.length} series.\n`);

  let fixedRounds   = 0;
  let fixedWins     = 0;
  let fixedNumbers  = 0;

  for (const series of allSeries) {
    const t1  = series.team1;
    const t2  = series.team2;
    const tag = `${t1.abbreviation} vs ${t2.abbreviation}`;

    // ── 1. Fix null/wrong conference ──────────────────────────
    // Also fixes conference="Finals" on non-Finals rounds (ESPN omits
    // the conference name in some R2/R3 note headlines).
    const isFinalsMislabel =
      series.conference === "Finals" && series.round !== null && series.round < 4;

    if (series.round === null || series.conference === null || isFinalsMislabel) {
      const conf1 = t1.conference?.toUpperCase() ?? "";
      const conf2 = t2.conference?.toUpperCase() ?? "";
      const sameConf = conf1 === conf2;

      let newConference: string | null = null;
      if (sameConf) {
        newConference = conf1 === "EAST" ? "East" : conf1 === "WEST" ? "West" : null;
      } else {
        // Cross-conference = NBA Finals
        newConference = "Finals";
      }

      // Preserve existing round if already set; only infer round=1 when null
      const newRound = series.round ?? (sameConf ? 1 : null);

      const confNeedsUpdate = newConference !== null && newConference !== series.conference;
      const roundNeedsUpdate = newRound !== null && newRound !== series.round;

      if (confNeedsUpdate || roundNeedsUpdate) {
        console.log(
          `  📍 ${tag}: ` +
          (roundNeedsUpdate ? `round ${series.round ?? "null"} → ${newRound}` : "") +
          (roundNeedsUpdate && confNeedsUpdate ? ", " : "") +
          (confNeedsUpdate ? `conf "${series.conference ?? "null"}" → "${newConference}"` : "")
        );
        if (!dryRun) {
          await prisma.playoffSeries.update({
            where: { id: series.id },
            data: {
              ...(roundNeedsUpdate ? { round: newRound } : {}),
              ...(confNeedsUpdate  ? { conference: newConference } : {}),
            },
          });
        }
        fixedRounds++;
      } else if (!newConference) {
        console.log(`  ⚠️  ${tag}: cannot infer conference (conf1=${conf1}, conf2=${conf2})`);
      }
    }

    // ── 2. Recount wins ───────────────────────────────────────
    const finalGames = series.games.filter((g) => g.status === "FINAL" && g.winnerId);
    let t1Wins = 0;
    let t2Wins = 0;
    for (const g of finalGames) {
      if (g.winnerId === t1.id) t1Wins++;
      else if (g.winnerId === t2.id) t2Wins++;
    }

    const isComplete = t1Wins >= 4 || t2Wins >= 4;
    const winnerId   = t1Wins >= 4 ? t1.id : t2Wins >= 4 ? t2.id : null;
    const status     = isComplete ? "COMPLETED" : "ACTIVE";

    const winsChanged =
      series.team1Wins !== t1Wins ||
      series.team2Wins !== t2Wins ||
      series.status    !== status;

    if (winsChanged) {
      console.log(
        `  🔢 ${tag}: wins ${series.team1Wins}-${series.team2Wins}${series.status !== status ? ` [${series.status}]` : ""} → ` +
        `${t1Wins}-${t2Wins}${isComplete ? ` [${status}]` : ""}`
      );
      if (!dryRun) {
        await prisma.playoffSeries.update({
          where: { id: series.id },
          data:  { team1Wins: t1Wins, team2Wins: t2Wins, status, winnerId },
        });
      }
      fixedWins++;
    }

    // ── 3. Assign game numbers ────────────────────────────────
    const gamesInOrder = series.games; // already sorted by gameDate asc
    for (let i = 0; i < gamesInOrder.length; i++) {
      const game     = gamesInOrder[i];
      const expected = i + 1;
      if (game.gameNumber !== expected) {
        if (!dryRun) {
          await prisma.game.update({
            where: { id: game.id },
            data:  { gameNumber: expected },
          });
        }
        fixedNumbers++;
      }
    }
  }

  console.log(`
✅ Done${dryRun ? " (dry run)" : ""}:
   • ${fixedRounds} series had round/conference set
   • ${fixedWins} series had win counts corrected
   • ${fixedNumbers} games had gameNumber assigned
`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
