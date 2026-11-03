/**
 * Script : Charger les boxscores des matchs postseason déjà terminés
 *
 * À lancer après seed-espn pour récupérer les stats des matchs
 * Play-In et Playoffs qui étaient déjà FINAL au moment du seed.
 *
 * Usage :
 *   npm run db:seed-boxscores                      → tous les postseason FINAL sans stats
 *   npm run db:seed-boxscores -- --season=2025-26  → saison spécifique
 *   npm run db:seed-boxscores -- --type=Playoffs   → playoffs uniquement
 *   npm run db:seed-boxscores -- --type=Play-In Tournament
 */

import { prisma } from "../src/lib/prisma";
import { fetchAndSaveGameStats } from "../src/lib/espn-stats";
import { recalculatePlayerStatsForGame } from "../src/lib/calculate-player-season-stats";
import {
  getScoreMarginCategory,
  calculateTotalPoints,
  ScoreMarginCategory,
} from "../src/types/bonus";
import { getCurrentSeason } from "../src/types/season";

const DELAY_MS = 800; // Rate limiting ESPN API

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Parsing des arguments
  const args = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const typeArg   = args.find((a) => a.startsWith("--type="))?.split("=").slice(1).join("=");

  const season = seasonArg ?? getCurrentSeason();
  const seasonTypes = typeArg
    ? [typeArg]
    : ["Play-In Tournament", "Playoffs"];

  console.log(`\n🏀 Seed Boxscores — Saison ${season}`);
  console.log(`📋 Types : ${seasonTypes.join(", ")}\n`);

  // ============================================================
  // 1. Trouver tous les matchs FINAL sans boxscore chargé
  // ============================================================
  const gamesToProcess = await prisma.game.findMany({
    where: {
      season,
      status: "FINAL",
      seasonType: { in: seasonTypes },
      topScorerId: null, // Pas encore de boxscore
    },
    include: {
      predictions: {
        include: {
          predictedTopScorer: {
            include: {
              seasonStats: {
                where: { season },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { gameDate: "asc" },
  });

  console.log(`🔍 ${gamesToProcess.length} matchs FINAL sans boxscore trouvés\n`);

  if (gamesToProcess.length === 0) {
    console.log("✅ Rien à faire.");
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const game of gamesToProcess) {
    console.log(`\n[${processed + 1}/${gamesToProcess.length}] ${game.externalId} — ${game.seasonType}`);

    // ============================================================
    // 2. Fetch + sauvegarde du boxscore
    // ============================================================
    let topScorer: { playerId: string; points: number } | null = null;

    try {
      topScorer = await fetchAndSaveGameStats(game.externalId, game.id);
    } catch (error) {
      console.error(`  ❌ Boxscore failed:`, error);
      errors++;
      await delay(DELAY_MS);
      continue;
    }

    // ============================================================
    // 3. Score margin + overtime + mise à jour du match
    // ============================================================
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    const hasOvertime = (game.currentPeriod ?? 0) > 4;
    const actualScoreMargin = Math.abs(homeScore - awayScore);
    const scoreMarginCategory = getScoreMarginCategory(homeScore, awayScore, hasOvertime);

    await prisma.game.update({
      where: { id: game.id },
      data: {
        topScorerId: topScorer?.playerId ?? null,
        topScorerPoints: topScorer?.points ?? null,
        actualScoreMargin,
        scoreMarginCategory,
        hasOvertime,
      },
    });

    console.log(
      `  ✅ Top scorer: ${topScorer ? `${topScorer.points} pts` : "n/a"} | Margin: ${scoreMarginCategory} (${actualScoreMargin} pts)`
    );

    // ============================================================
    // 4. Calculer les pronostics en attente (PENDING)
    // ============================================================
    const pendingPredictions = game.predictions.filter((p) => p.result === "PENDING");

    if (pendingPredictions.length > 0) {
      const winnerId =
        homeScore > awayScore ? game.homeTeamId : game.awayTeamId;

      for (const prediction of pendingPredictions) {
        const didWin = prediction.predictedTeamId === winnerId;
        const predictedTopScorerAverage =
          prediction.predictedTopScorer?.seasonStats?.[0]?.pointsPerGame ?? 0;

        const bonusResult = calculateTotalPoints({
          predictionWon: didWin,
          predictedMargin: prediction.predictedScoreMargin as ScoreMarginCategory | null,
          actualMargin: scoreMarginCategory,
          predictedTopScorerId: prediction.predictedTopScorerId,
          actualTopScorerId: topScorer?.playerId ?? null,
          predictedTopScorerAverage,
        });

        await prisma.prediction.update({
          where: { id: prediction.id },
          data: {
            result: didWin ? "WON" : "LOST",
            pointsEarned: bonusResult.total,
            marginBonusPoints: bonusResult.marginBonus,
            topScorerBonusPoints: bonusResult.topScorerBonus,
            comboBonusPoints: bonusResult.comboBonus,
          },
        });
      }

      console.log(`  🎯 ${pendingPredictions.length} pronos calculés`);
    }

    // ============================================================
    // 5. Recalculer les stats saison des joueurs impliqués
    //    (Ne compte PAS dans les moyennes saison régulière — le filtre
    //     seasonType est dans calculatePlayerSeasonStats)
    // ============================================================
    try {
      const updated = await recalculatePlayerStatsForGame(game.id, prisma);
      console.log(`  📊 ${updated} joueurs mis à jour`);
    } catch (error) {
      console.error(`  ⚠️  Player stats error:`, error);
    }

    processed++;
    await delay(DELAY_MS);
  }

  console.log(`\n✨ Terminé : ${processed} matchs traités, ${errors} erreurs`);
}

main()
  .then(() => {
    console.log("\n✅ Processus terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  });
