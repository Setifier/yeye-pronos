import { NextRequest, NextResponse } from "next/server";
import { fetchTodaysGames } from "@/lib/espn";
import { prisma } from "@/lib/prisma";
import { GameStatus, PredictionResult } from "@/generated/prisma";
import {
  notifyGameFinished,
  notifyPronoWon,
  notifyPronoLost,
} from "@/lib/notification-service";
import { checkAndAwardBadges } from "@/lib/badge-service";
import { fetchAndSaveGameStatsWithDelay } from "@/lib/espn-stats";
import { getScoreMarginCategory, calculateTotalPoints, ScoreMarginCategory } from "@/types/bonus";

/**
 * CRON Job: Update Live Scores + Standings
 *
 * Déclenché toutes les 45-60 secondes pendant les heures de matchs NBA
 * (généralement 19h - 02h heure de Paris)
 *
 * Objectif :
 * - Récupérer les scores en temps réel depuis ESPN
 * - Mettre à jour le status des matchs (SCHEDULED → LIVE → FINAL)
 * - Mettre à jour les scores + période + horloge
 * - Calculer les résultats des pronos quand le match est terminé
 * - Recalculer les standings NBA après chaque match terminé
 *
 * Sécurité : Protégé par CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier le secret CRON
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON LIVE] Starting live scores + standings update...");

    // Obtenir la date du jour en heure de Paris
    const parisTime = new Date().toLocaleString("en-US", {
      timeZone: "Europe/Paris",
    });
    const today = new Date(parisTime);
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    console.log(`[CRON LIVE] Fetching live scores for: ${dateString}`);

    // Récupérer les matchs du jour depuis ESPN
    const liveGames = await fetchTodaysGames(dateString);

    console.log(`[CRON LIVE] Found ${liveGames.length} games to check`);

    let updated = 0;
    let finalized = 0;
    const teamsToRecalculate = new Set<string>();

    for (const game of liveGames) {
      const dbGame = await prisma.game.findUnique({
        where: { externalId: String(game.id) },
        include: {
          predictions: true,
        },
      });

      if (!dbGame) {
        console.log(`[CRON LIVE] Game ${game.id} not in DB, skipping`);
        continue;
      }

      // Mapper le status ESPN → notre enum
      let newStatus: GameStatus = "SCHEDULED";
      if (game.status === "Final" || game.status === "FINAL") {
        newStatus = "FINAL";
      } else if (game.status === "InProgress" || game.status === "LIVE") {
        newStatus = "LIVE";
      }

      // Vérifier si le match vient de se terminer
      const wasLive = dbGame.status === "LIVE";
      const nowFinal = newStatus === "FINAL";
      const justFinished = wasLive && nowFinal;

      // Mettre à jour le match (avec période et horloge pour les matchs LIVE)
      await prisma.game.update({
        where: { id: dbGame.id },
        data: {
          status: newStatus,
          homeScore: game.home_team_score ?? null,
          awayScore: game.visitor_team_score ?? null,
          currentPeriod: game.currentPeriod ?? null,
          gameClock: game.gameClock ?? null,
          winnerId:
            nowFinal && game.home_team_score !== null && game.visitor_team_score !== null
              ? game.home_team_score > game.visitor_team_score
                ? dbGame.homeTeamId
                : dbGame.awayTeamId
              : null,
        },
      });

      updated++;

      // Si le match vient de se terminer, calculer les résultats des pronos
      if (justFinished && game.home_team_score !== null && game.visitor_team_score !== null) {
        console.log(`[CRON LIVE] Game ${game.id} just finished, calculating predictions...`);

        const winnerId =
          game.home_team_score > game.visitor_team_score
            ? dbGame.homeTeamId
            : dbGame.awayTeamId;

        // Ajouter les 2 équipes à recalculer pour les standings
        teamsToRecalculate.add(dbGame.homeTeamId);
        teamsToRecalculate.add(dbGame.awayTeamId);

        // 🆕 ÉTAPE 1: Récupérer les stats et identifier le top scorer
        console.log(`[CRON LIVE] Fetching player stats for game ${game.id}...`);

        let topScorer: { playerId: string; points: number } | null = null;

        try {
          topScorer = await fetchAndSaveGameStatsWithDelay(
            String(game.id),     // ESPN game ID
            dbGame.id,           // DB game UUID
            500                  // Délai 500ms (rate limiting léger)
          );

          if (topScorer) {
            console.log(`[CRON LIVE] ✅ Top scorer: ${topScorer.points} pts`);
          }
        } catch (error) {
          console.error(`[CRON LIVE] ⚠️  Error fetching stats:`, error);
          // Continue quand même (pas de bonus mais prono calculé)
        }

        // 🆕 ÉTAPE 2: Calculer le score margin
        const actualMargin = Math.abs(game.home_team_score - game.visitor_team_score);
        const hasOvertime = (game.currentPeriod ?? 0) > 4;
        const scoreMarginCategory = getScoreMarginCategory(
          game.home_team_score,
          game.visitor_team_score,
          hasOvertime
        );

        console.log(`[CRON LIVE] Score margin: ${scoreMarginCategory} (${actualMargin} pts, OT: ${hasOvertime})`);

        // 🆕 ÉTAPE 3: Mettre à jour le Game avec les infos bonus
        await prisma.game.update({
          where: { id: dbGame.id },
          data: {
            topScorerId: topScorer?.playerId ?? null,
            topScorerPoints: topScorer?.points ?? null,
            actualScoreMargin: actualMargin,
            scoreMarginCategory,
            hasOvertime,
          },
        });

        // 🆕 ÉTAPE 3.5: Recalculer les stats moyennes des joueurs qui ont participé
        if (topScorer) {
          // Seulement si on a réussi à fetch les stats
          try {
            const { recalculatePlayerStatsForGame } = await import(
              "@/lib/calculate-player-season-stats"
            );
            const playersUpdated = await recalculatePlayerStatsForGame(
              dbGame.id,
              prisma
            );
            console.log(
              `[CRON LIVE] ✅ Updated season stats for ${playersUpdated} players`
            );
          } catch (error) {
            console.error(
              `[CRON LIVE] ⚠️  Error updating player season stats:`,
              error
            );
            // Continue quand même
          }
        }

        // ÉTAPE 4: Récupérer les infos des équipes pour les notifications
        // Déterminer la saison actuelle pour les stats (format: "2025-26")
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        // La saison NBA commence en octobre, donc si on est avant octobre, c'est la saison précédente
        const seasonYear = currentMonth >= 9 ? currentYear : currentYear - 1;
        const nextYearShort = (seasonYear + 1).toString().slice(-2);
        const currentSeason = `${seasonYear}-${nextYearShort}`;

        const gameWithTeams = await prisma.game.findUnique({
          where: { id: dbGame.id },
          include: {
            homeTeam: true,
            awayTeam: true,
            topScorer: true,
            predictions: {
              include: {
                user: true,
                // Inclure le joueur prédit avec ses stats de saison pour la cote
                predictedTopScorer: {
                  include: {
                    seasonStats: {
                      where: { season: currentSeason },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });

        if (!gameWithTeams) continue;

        // 🆕 ÉTAPE 5: Mettre à jour tous les pronos AVEC BONUS
        for (const prediction of gameWithTeams.predictions) {
          const didWin = prediction.predictedTeamId === winnerId;

          // Récupérer la moyenne du joueur prédit pour calculer la cote
          const predictedTopScorerAverage =
            prediction.predictedTopScorer?.seasonStats?.[0]?.pointsPerGame ?? 0;

          // Calculer tous les bonus
          const bonusResult = calculateTotalPoints({
            predictionWon: didWin,
            predictedMargin: prediction.predictedScoreMargin as ScoreMarginCategory | null,
            actualMargin: scoreMarginCategory,
            predictedTopScorerId: prediction.predictedTopScorerId,
            actualTopScorerId: topScorer?.playerId ?? null,
            predictedTopScorerAverage, // 🆕 Moyenne pour calculer la cote
          });

          console.log(
            `[CRON LIVE] User ${prediction.user.name}: ` +
            `Base ${bonusResult.basePoints} + ` +
            `Margin ${bonusResult.marginBonus} + ` +
            `TopScorer ${bonusResult.topScorerBonus} + ` +
            `Combo ${bonusResult.comboBonus} = ` +
            `${bonusResult.total} pts`
          );

          // Mettre à jour le prono avec TOUS les points
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: {
              result: didWin ? "WON" : "LOST",
              pointsEarned: bonusResult.total, // 🆕 Total avec bonus
              marginBonusPoints: bonusResult.marginBonus, // 🆕
              topScorerBonusPoints: bonusResult.topScorerBonus, // 🆕
              comboBonusPoints: bonusResult.comboBonus, // 🆕
            },
          });

          // Créer les notifications (avec le NOUVEAU total de points)
          try {
            // Notification: Match terminé
            await notifyGameFinished({
              userId: prediction.userId,
              gameId: dbGame.id,
              homeTeam: gameWithTeams.homeTeam.abbreviation,
              awayTeam: gameWithTeams.awayTeam.abbreviation,
              homeScore: game.home_team_score,
              awayScore: game.visitor_team_score,
            });

            // Notification: Prono gagné/perdu
            if (didWin) {
              await notifyPronoWon({
                userId: prediction.userId,
                gameId: dbGame.id,
                predictionId: prediction.id,
                points: bonusResult.total, // 🆕 Nouveau total
                homeTeam: gameWithTeams.homeTeam.abbreviation,
                awayTeam: gameWithTeams.awayTeam.abbreviation,
              });
            } else {
              await notifyPronoLost({
                userId: prediction.userId,
                gameId: dbGame.id,
                predictionId: prediction.id,
                homeTeam: gameWithTeams.homeTeam.abbreviation,
                awayTeam: gameWithTeams.awayTeam.abbreviation,
              });
            }

            console.log(`[CRON LIVE] Notifications créées pour user ${prediction.user.name}`);
          } catch (error) {
            console.error(`[CRON LIVE] Erreur création notifications:`, error);
          }

          // Vérifier et attribuer les badges après la mise à jour du prono
          try {
            const newBadges = await checkAndAwardBadges(prediction.userId);
            if (newBadges.length > 0) {
              console.log(`[CRON LIVE] ${newBadges.length} nouveau(x) badge(s) pour user ${prediction.user.name}`);

              // TODO: Créer une notification pour chaque nouveau badge
              // await notifyBadgeUnlocked({ userId, badgeId })
            }
          } catch (error) {
            console.error(`[CRON LIVE] Erreur vérification badges:`, error);
          }
        }

        finalized++;
        console.log(`[CRON LIVE] Updated ${gameWithTeams.predictions.length} predictions for game ${game.id}`);
      }
    }

    // Recalculer les standings pour les équipes dont les matchs viennent de se terminer
    if (teamsToRecalculate.size > 0) {
      console.log(`[CRON LIVE] Recalculating standings for ${teamsToRecalculate.size} teams...`);

      try {
        // Import dynamique pour éviter les circular dependencies
        const { calculateStandings } = await import("@/lib/standings-calculator");

        for (const teamId of teamsToRecalculate) {
          await calculateStandings(teamId);
        }

        console.log(`[CRON LIVE] Standings recalculated successfully`);
      } catch (error) {
        console.error(`[CRON LIVE] Error recalculating standings:`, error);
        // Ne pas bloquer le reste du CRON si le calcul des standings échoue
      }
    }

    console.log(
      `[CRON LIVE] Live scores update complete: ${updated} games updated, ${finalized} games finalized`
    );

    return NextResponse.json({
      success: true,
      date: dateString,
      totalGames: liveGames.length,
      updated,
      finalized,
      standingsRecalculated: teamsToRecalculate.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON LIVE] Error updating live scores:", error);
    return NextResponse.json(
      {
        error: "Error updating live scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
