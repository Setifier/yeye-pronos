/**
 * Script : Rattrapage complet saison régulière (+ NBA Cup)
 *
 * PHASE 1 — Scores manquants
 *   Trouve les matchs encore SCHEDULED/LIVE dont la date est passée,
 *   récupère les scores ESPN et les passe en FINAL.
 *
 * PHASE 2 — Boxscores manquants
 *   Pour tous les matchs FINAL sans stats, récupère le boxscore complet,
 *   calcule les pronos en attente, met à jour les moyennes joueurs.
 *
 * PHASE 3 — Standings
 *   Recalcule le bilan de toutes les équipes concernées.
 *
 * Note : La NBA Cup est classée season.type=2 (Regular Season) par ESPN,
 *        elle est donc incluse automatiquement.
 *
 * Usage :
 *   npm run db:seed-boxscores-regular                      → saison en cours
 *   npm run db:seed-boxscores-regular -- --season=2025-26  → saison spécifique
 */

import { prisma } from "../src/lib/prisma";
import { fetchTodaysGames } from "../src/lib/espn";
import { fetchAndSaveGameStats } from "../src/lib/espn-stats";
import { recalculatePlayerStatsForGame } from "../src/lib/calculate-player-season-stats";
import { calculateStandings } from "../src/lib/standings-calculator";
import {
  getScoreMarginCategory,
  calculateTotalPoints,
  ScoreMarginCategory,
} from "../src/types/bonus";
import { getCurrentSeason } from "../src/types/season";

const DELAY_MS = 800;

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// PHASE 1 : Mise à jour des scores manquants
// ============================================================
async function updateMissingScores(season: string): Promise<string[]> {
  console.log("\n📡 PHASE 1 — Scores manquants\n");

  // Matchs passés non finalisés
  const staleGames = await prisma.game.findMany({
    where: {
      season,
      seasonType: "Regular Season",
      status: { in: ["SCHEDULED", "LIVE"] },
      gameDate: { lt: new Date() },
    },
    orderBy: { gameDate: "asc" },
  });

  if (staleGames.length === 0) {
    console.log("  ✅ Aucun score manquant.\n");
    return [];
  }

  console.log(`  🔍 ${staleGames.length} matchs sans score final trouvés`);

  // Grouper par date ESPN (format YYYY-MM-DD en Eastern Time)
  const dateMap = new Map<string, typeof staleGames>();
  for (const game of staleGames) {
    const espnDate = game.gameDate.toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
    if (!dateMap.has(espnDate)) dateMap.set(espnDate, []);
    dateMap.get(espnDate)!.push(game);
  }

  const nowFinalIds: string[] = [];

  for (const [dateString, games] of dateMap) {
    console.log(`\n  📅 ${dateString} (${games.length} matchs)`);

    let espnGames;
    try {
      espnGames = await fetchTodaysGames(dateString);
    } catch (err) {
      console.error(`  ❌ ESPN fetch failed pour ${dateString}:`, err);
      continue;
    }

    for (const game of games) {
      const espnGame = espnGames.find((g) => String(g.id) === game.externalId);
      if (!espnGame) {
        console.log(`  ⚠️  ${game.externalId} non trouvé sur ESPN pour ${dateString}`);
        continue;
      }

      const newStatus = espnGame.status as
        | "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED";

      const homeScore = espnGame.home_team_score ?? null;
      const awayScore = espnGame.visitor_team_score ?? null;

      const winnerId =
        newStatus === "FINAL" && homeScore !== null && awayScore !== null
          ? homeScore > awayScore
            ? game.homeTeamId
            : game.awayTeamId
          : null;

      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: newStatus,
          homeScore,
          awayScore,
          winnerId,
          currentPeriod: espnGame.currentPeriod ?? null,
          gameClock:     espnGame.gameClock     ?? null,
        },
      });

      if (newStatus === "FINAL") {
        nowFinalIds.push(game.id);
        console.log(
          `  ✅ ${game.externalId} → FINAL (${homeScore}-${awayScore})`
        );
      } else if (newStatus === "POSTPONED") {
        // Annuler les pronos
        await prisma.prediction.updateMany({
          where: { gameId: game.id, result: "PENDING" },
          data: { result: "CANCELLED", pointsEarned: 0 },
        });
        console.log(`  ⚠️  ${game.externalId} → POSTPONED, pronos annulés`);
      } else {
        console.log(`  ℹ️  ${game.externalId} → ${newStatus} (pas encore fini ?)`);
      }
    }

    await delay(400);
  }

  console.log(
    `\n  ✅ Phase 1 terminée : ${nowFinalIds.length} match(s) passés en FINAL\n`
  );
  return nowFinalIds;
}

// ============================================================
// PHASE 2 : Boxscores + pronos + stats joueurs
// ============================================================
async function fetchMissingBoxscores(
  season: string,
  teamsToRecalculate: Set<string>
): Promise<void> {
  console.log("📦 PHASE 2 — Boxscores manquants\n");

  const gamesToProcess = await prisma.game.findMany({
    where: {
      season,
      status: "FINAL",
      seasonType: "Regular Season",
      topScorerId: null,
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

  console.log(`  🔍 ${gamesToProcess.length} matchs FINAL sans boxscore\n`);

  if (gamesToProcess.length === 0) {
    console.log("  ✅ Aucun boxscore manquant.\n");
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const game of gamesToProcess) {
    console.log(
      `  [${processed + 1}/${gamesToProcess.length}] ${game.externalId} — ` +
      new Date(game.gameDate).toLocaleDateString("fr-FR")
    );

    // Boxscore ESPN
    let topScorer: { playerId: string; points: number } | null = null;
    try {
      topScorer = await fetchAndSaveGameStats(game.externalId, game.id);
    } catch (error) {
      console.error(`  ❌ Boxscore failed:`, error);
      errors++;
      await delay(DELAY_MS);
      continue;
    }

    // Score margin + overtime
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    const hasOvertime = (game.currentPeriod ?? 0) > 4;
    const actualScoreMargin = Math.abs(homeScore - awayScore);
    const scoreMarginCategory = getScoreMarginCategory(homeScore, awayScore, hasOvertime);

    await prisma.game.update({
      where: { id: game.id },
      data: {
        topScorerId:      topScorer?.playerId ?? null,
        topScorerPoints:  topScorer?.points   ?? null,
        actualScoreMargin,
        scoreMarginCategory,
        hasOvertime,
      },
    });

    console.log(
      `  ✅ Top scorer: ${topScorer ? `${topScorer.points} pts` : "n/a"} | ` +
      `Margin: ${scoreMarginCategory} (${actualScoreMargin} pts)`
    );

    // Pronos en attente
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
            pointsEarned:         bonusResult.total,
            marginBonusPoints:    bonusResult.marginBonus,
            topScorerBonusPoints: bonusResult.topScorerBonus,
            comboBonusPoints:     bonusResult.comboBonus,
          },
        });
      }
      console.log(`  🎯 ${pendingPredictions.length} pronos calculés`);
    }

    // Stats saison joueurs
    try {
      const updated = await recalculatePlayerStatsForGame(game.id, prisma);
      console.log(`  📊 ${updated} joueurs mis à jour`);
    } catch (error) {
      console.error(`  ⚠️  Player stats error:`, error);
    }

    // Marquer les équipes pour standings
    teamsToRecalculate.add(game.homeTeamId);
    teamsToRecalculate.add(game.awayTeamId);

    processed++;
    await delay(DELAY_MS);
  }

  console.log(
    `\n  ✅ Phase 2 terminée : ${processed} traités, ${errors} erreurs\n`
  );
}

// ============================================================
// PHASE 3 : Standings équipes
// ============================================================
async function recalculateStandings(teamsToRecalculate: Set<string>): Promise<void> {
  if (teamsToRecalculate.size === 0) return;

  console.log(`🏆 PHASE 3 — Standings (${teamsToRecalculate.size} équipes)\n`);

  for (const teamId of teamsToRecalculate) {
    try {
      await calculateStandings(teamId);
    } catch (error) {
      console.error(`  ⚠️  Standings error pour team ${teamId}:`, error);
    }
  }

  console.log("  ✅ Standings mis à jour\n");
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const season = seasonArg ?? getCurrentSeason();

  console.log(`\n🏀 Rattrapage Saison Régulière — ${season}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const teamsToRecalculate = new Set<string>();

  // Phase 1 : scores manquants
  await updateMissingScores(season);

  // Phase 2 : boxscores + pronos + stats joueurs
  await fetchMissingBoxscores(season, teamsToRecalculate);

  // Phase 3 : standings
  await recalculateStandings(teamsToRecalculate);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ Rattrapage complet terminé !");
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
