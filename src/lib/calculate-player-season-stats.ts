/**
 * Calcul des stats moyennes des joueurs (PlayerSeasonStats)
 * Appelé après chaque match terminé pour mettre à jour les moyennes
 */

import { PrismaClient } from "@/generated/prisma";

const CURRENT_SEASON = "2025-26";

interface PlayerGameStats {
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointsMade: number;
  threePointsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
}

/**
 * Recalcule les stats saison d'un joueur à partir de tous ses matchs
 */
async function calculatePlayerSeasonStats(
  playerId: string,
  prisma: PrismaClient
): Promise<void> {
  // Récupérer toutes les stats de matchs du joueur pour la saison
  const gameStats = await prisma.gamePlayerStats.findMany({
    where: {
      playerId,
      game: {
        season: CURRENT_SEASON,
        status: "FINAL",
      },
    },
    select: {
      minutes: true,
      points: true,
      rebounds: true,
      assists: true,
      steals: true,
      blocks: true,
      turnovers: true,
      fieldGoalsMade: true,
      fieldGoalsAttempted: true,
      threePointersMade: true,
      threePointersAttempted: true,
      freeThrowsMade: true,
      freeThrowsAttempted: true,
    },
  });

  if (gameStats.length === 0) {
    // Pas de stats pour ce joueur cette saison, supprimer s'il existe
    await prisma.playerSeasonStats.deleteMany({
      where: {
        playerId,
        season: CURRENT_SEASON,
      },
    });
    return;
  }

  // Calculer les totaux
  let totalPoints = 0;
  let totalRebounds = 0;
  let totalAssists = 0;
  let totalSteals = 0;
  let totalBlocks = 0;
  let totalTurnovers = 0;
  let totalFGM = 0;
  let totalFGA = 0;
  let total3PM = 0;
  let total3PA = 0;
  let totalFTM = 0;
  let totalFTA = 0;

  // Compteurs pour DD/TD
  let doubleDoubles = 0;
  let tripleDoubles = 0;

  for (const game of gameStats) {
    // Note: minutes est un String format "32:45", on ne l'additionne pas ici
    totalPoints += game.points || 0;
    totalRebounds += game.rebounds || 0;
    totalAssists += game.assists || 0;
    totalSteals += game.steals || 0;
    totalBlocks += game.blocks || 0;
    totalTurnovers += game.turnovers || 0;
    totalFGM += game.fieldGoalsMade || 0;
    totalFGA += game.fieldGoalsAttempted || 0;
    total3PM += game.threePointersMade || 0;
    total3PA += game.threePointersAttempted || 0;
    totalFTM += game.freeThrowsMade || 0;
    totalFTA += game.freeThrowsAttempted || 0;

    // Calculer DD/TD pour ce match
    const stats = [
      game.points || 0,
      game.rebounds || 0,
      game.assists || 0,
      game.steals || 0,
      game.blocks || 0,
    ];
    const doubleDigitStats = stats.filter((s) => s >= 10).length;

    if (doubleDigitStats >= 3) {
      tripleDoubles++;
    } else if (doubleDigitStats >= 2) {
      doubleDoubles++;
    }
  }

  const gamesPlayed = gameStats.length;

  // Calculer les moyennes par match
  const pointsPerGame = totalPoints / gamesPlayed;
  const reboundsPerGame = totalRebounds / gamesPlayed;
  const assistsPerGame = totalAssists / gamesPlayed;
  const stealsPerGame = totalSteals / gamesPlayed;
  const blocksPerGame = totalBlocks / gamesPlayed;
  const turnoversPerGame = totalTurnovers / gamesPlayed;

  // Calculer les pourcentages
  const fieldGoalPct = totalFGA > 0 ? totalFGM / totalFGA : 0;
  const threePointPct = total3PA > 0 ? total3PM / total3PA : 0;
  const freeThrowPct = totalFTA > 0 ? totalFTM / totalFTA : 0;

  // Upsert dans PlayerSeasonStats
  await prisma.playerSeasonStats.upsert({
    where: {
      playerId_season: {
        playerId,
        season: CURRENT_SEASON,
      },
    },
    create: {
      playerId,
      season: CURRENT_SEASON,
      gamesPlayed,
      pointsPerGame,
      reboundsPerGame,
      assistsPerGame,
      stealsPerGame,
      blocksPerGame,
      turnoversPerGame,
      fieldGoalPct,
      threePointPct,
      freeThrowPct,
      totalPoints: totalPoints,
      totalRebounds: totalRebounds,
      totalAssists: totalAssists,
      doubleDoubles,
      tripleDoubles,
    },
    update: {
      gamesPlayed,
      pointsPerGame,
      reboundsPerGame,
      assistsPerGame,
      stealsPerGame,
      blocksPerGame,
      turnoversPerGame,
      fieldGoalPct,
      threePointPct,
      freeThrowPct,
      totalPoints: totalPoints,
      totalRebounds: totalRebounds,
      totalAssists: totalAssists,
      doubleDoubles,
      tripleDoubles,
    },
  });
}

/**
 * Recalcule les stats de tous les joueurs qui ont participé à un match
 * À appeler après qu'un match soit terminé et que les stats aient été récupérées
 */
export async function recalculatePlayerStatsForGame(
  gameId: string,
  prisma: PrismaClient
): Promise<number> {
  // Récupérer tous les joueurs qui ont des stats pour ce match
  const playerStats = await prisma.gamePlayerStats.findMany({
    where: { gameId },
    select: { playerId: true },
    distinct: ["playerId"],
  });

  console.log(
    `[PLAYER STATS] Recalculating stats for ${playerStats.length} players from game ${gameId}`
  );

  // Recalculer les stats de chaque joueur
  for (const ps of playerStats) {
    try {
      await calculatePlayerSeasonStats(ps.playerId, prisma);
    } catch (error) {
      console.error(
        `[PLAYER STATS] Error calculating stats for player ${ps.playerId}:`,
        error
      );
      // Continue avec les autres joueurs même si un échoue
    }
  }

  return playerStats.length;
}

/**
 * Recalcule les stats de TOUS les joueurs (à utiliser pour une initialisation complète)
 */
export async function recalculateAllPlayerStats(
  prisma: PrismaClient
): Promise<void> {
  console.log("[PLAYER STATS] Recalculating stats for ALL players...");

  // Récupérer tous les joueurs qui ont au moins une stat de match
  const playersWithStats = await prisma.gamePlayerStats.findMany({
    where: {
      game: {
        season: CURRENT_SEASON,
        status: "FINAL",
      },
    },
    select: { playerId: true },
    distinct: ["playerId"],
  });

  console.log(
    `[PLAYER STATS] Found ${playersWithStats.length} players with stats this season`
  );

  let completed = 0;
  for (const ps of playersWithStats) {
    try {
      await calculatePlayerSeasonStats(ps.playerId, prisma);
      completed++;

      if (completed % 50 === 0) {
        console.log(
          `[PLAYER STATS] Progress: ${completed}/${playersWithStats.length}`
        );
      }
    } catch (error) {
      console.error(
        `[PLAYER STATS] Error calculating stats for player ${ps.playerId}:`,
        error
      );
    }
  }

  console.log(
    `[PLAYER STATS] Completed: ${completed}/${playersWithStats.length} players`
  );
}
