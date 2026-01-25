import { prisma } from "@/lib/prisma";
import { PredictionResult } from "@/generated/prisma";

/**
 * Type definitions pour les retours de fonctions
 */
export interface UserStats {
  totalPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  winRate: number;
  totalPoints: number;
  currentStreak: {
    type: "WIN" | "LOSS" | null;
    count: number;
  };
  competitionsParticipated: number;
  competitionsWon: number;
  competitionsWinRate: number;
}

export interface RecentPrediction {
  id: string;
  gameId: string;
  gameDate: Date;
  homeTeam: {
    name: string;
    city: string;
    abbreviation: string;
  };
  awayTeam: {
    name: string;
    city: string;
    abbreviation: string;
  };
  predictedTeam: {
    name: string;
    city: string;
    abbreviation: string;
  };
  result: PredictionResult;
  pointsEarned: number;
  finalScore: {
    home: number | null;
    away: number | null;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  predictions: number;
}

export interface LeaderboardData {
  topUsers: LeaderboardEntry[];
  currentUser: {
    rank: number;
    points: number;
    predictions: number;
  } | null;
}

/**
 * Récupère les statistiques d'un utilisateur
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  // 1. Compter les pronos par résultat
  const predictionCounts = await prisma.prediction.groupBy({
    by: ["result"],
    where: { userId },
    _count: { result: true },
    _sum: { pointsEarned: true },
  });

  // Initialiser les compteurs
  let totalPredictions = 0;
  let wonPredictions = 0;
  let lostPredictions = 0;
  let pendingPredictions = 0;
  let totalPoints = 0;

  // Parcourir les résultats
  predictionCounts.forEach((group) => {
    const count = group._count.result;
    const points = group._sum.pointsEarned || 0;

    totalPredictions += count;
    totalPoints += points;

    if (group.result === PredictionResult.WON) {
      wonPredictions = count;
    } else if (group.result === PredictionResult.LOST) {
      lostPredictions = count;
    } else if (group.result === PredictionResult.PENDING) {
      pendingPredictions = count;
    }
  });

  // 2. Calculer le win rate
  const completedPredictions = wonPredictions + lostPredictions;
  const winRate =
    completedPredictions > 0
      ? Math.round((wonPredictions / completedPredictions) * 100 * 10) / 10
      : 0;

  // 3. Calculer la série en cours (streak)
  const currentStreak = await calculateStreak(userId);

  // 4. Calculer les participations aux compétitions
  const competitions = await prisma.competitionSeason.findMany();
  let competitionsParticipated = 0;
  let competitionsWon = 0;

  for (const competition of competitions) {
    // Vérifier si l'utilisateur a participé à cette compétition
    const participationCount = await prisma.prediction.count({
      where: {
        userId,
        game: {
          gameDate: {
            gte: competition.startDate,
            lte: competition.endDate,
          },
        },
      },
    });

    if (participationCount > 0) {
      competitionsParticipated++;

      // Vérifier si l'utilisateur a gagné cette compétition
      const competitionRanking = await prisma.prediction.groupBy({
        by: ["userId"],
        where: {
          game: {
            gameDate: {
              gte: competition.startDate,
              lte: competition.endDate,
            },
          },
        },
        _sum: {
          pointsEarned: true,
        },
        orderBy: {
          _sum: {
            pointsEarned: "desc",
          },
        },
        take: 1,
      });

      if (
        competitionRanking.length > 0 &&
        competitionRanking[0].userId === userId
      ) {
        competitionsWon++;
      }
    }
  }

  // Calculer le ratio de victoires dans les compétitions
  const competitionsWinRate =
    competitionsParticipated > 0
      ? Math.round((competitionsWon / competitionsParticipated) * 100 * 10) / 10
      : 0;

  return {
    totalPredictions,
    wonPredictions,
    lostPredictions,
    pendingPredictions,
    winRate,
    totalPoints,
    currentStreak,
    competitionsParticipated,
    competitionsWon,
    competitionsWinRate,
  };
}

/**
 * Calcule la série en cours (streak) d'un utilisateur
 */
async function calculateStreak(
  userId: string
): Promise<{ type: "WIN" | "LOSS" | null; count: number }> {
  // Récupérer les 50 derniers pronos terminés (non PENDING)
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      result: { not: PredictionResult.PENDING },
    },
    include: {
      game: true,
    },
    orderBy: {
      game: {
        gameDate: "desc",
      },
    },
    take: 50,
  });

  // Si aucun prono terminé, pas de série
  if (predictions.length === 0) {
    return { type: null, count: 0 };
  }

  // Le premier prono détermine le type de série
  const streakType = predictions[0].result as "WIN" | "LOSS";
  let count = 0;

  // Compter tant que le résultat est identique
  for (const prediction of predictions) {
    if (prediction.result === streakType) {
      count++;
    } else {
      break;
    }
  }

  return {
    type: streakType,
    count,
  };
}

/**
 * Récupère les N derniers pronos d'un utilisateur avec détails
 */
export async function getRecentPredictions(
  userId: string,
  limit = 10
): Promise<RecentPrediction[]> {
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: {
      game: {
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
    orderBy: {
      game: {
        gameDate: "desc",
      },
    },
    take: limit,
  });

  return predictions.map((prediction) => {
    // Déterminer l'équipe prédite
    const predictedTeam =
      prediction.predictedTeamId === prediction.game.homeTeamId
        ? prediction.game.homeTeam
        : prediction.game.awayTeam;

    return {
      id: prediction.id,
      gameId: prediction.gameId,
      gameDate: prediction.game.gameDate,
      homeTeam: {
        name: prediction.game.homeTeam.name,
        city: prediction.game.homeTeam.city,
        abbreviation: prediction.game.homeTeam.abbreviation,
      },
      awayTeam: {
        name: prediction.game.awayTeam.name,
        city: prediction.game.awayTeam.city,
        abbreviation: prediction.game.awayTeam.abbreviation,
      },
      predictedTeam: {
        name: predictedTeam.name,
        city: predictedTeam.city,
        abbreviation: predictedTeam.abbreviation,
      },
      result: prediction.result,
      pointsEarned: prediction.pointsEarned,
      finalScore: {
        home: prediction.game.homeScore,
        away: prediction.game.awayScore,
      },
    };
  });
}

/**
 * Récupère le classement (top N + position de l'utilisateur)
 * Peut filtrer par compétition si competitionSeasonId est fourni
 */
export async function getLeaderboard(
  currentUserId: string,
  topN = 10,
  competitionSeasonId?: string
): Promise<LeaderboardData> {
  // Si une compétition est spécifiée, filtrer par dates
  let whereClause = {};

  if (competitionSeasonId) {
    const competition = await prisma.competitionSeason.findUnique({
      where: { id: competitionSeasonId },
    });

    if (competition) {
      whereClause = {
        game: {
          gameDate: {
            gte: competition.startDate,
            lte: competition.endDate,
          },
        },
      };
    }
  }

  // 1. Agréger les points par utilisateur
  const userPoints = await prisma.prediction.groupBy({
    by: ["userId"],
    where: whereClause,
    _sum: {
      pointsEarned: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        pointsEarned: "desc",
      },
    },
  });

  // 2. Récupérer les noms des utilisateurs
  const userIds = userPoints.map((up) => up.userId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Créer un map userId -> name
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // 3. Construire le classement avec rangs
  const leaderboard: LeaderboardEntry[] = userPoints.map((up, index) => ({
    rank: index + 1,
    userId: up.userId,
    name: userMap.get(up.userId) || "Utilisateur inconnu",
    points: up._sum.pointsEarned || 0,
    predictions: up._count.id,
  }));

  // 4. Extraire le top N
  const topUsers = leaderboard.slice(0, topN);

  // 5. Trouver la position de l'utilisateur courant
  const currentUserIndex = leaderboard.findIndex(
    (entry) => entry.userId === currentUserId
  );

  let currentUser: LeaderboardData["currentUser"] = null;

  if (currentUserIndex !== -1) {
    const entry = leaderboard[currentUserIndex];
    currentUser = {
      rank: entry.rank,
      points: entry.points,
      predictions: entry.predictions,
    };
  }

  return {
    topUsers,
    currentUser,
  };
}

/**
 * Récupère le rang d'un utilisateur dans le classement général
 */
export async function getUserRank(userId: string): Promise<number> {
  // Agréger tous les users par points
  const allUsers = await prisma.prediction.groupBy({
    by: ["userId"],
    _sum: {
      pointsEarned: true,
    },
    orderBy: {
      _sum: {
        pointsEarned: "desc",
      },
    },
  });

  // Trouver la position de l'utilisateur
  const rank = allUsers.findIndex((u) => u.userId === userId) + 1;

  // Si l'utilisateur n'a pas de pronos, retourner la dernière position + 1
  return rank || allUsers.length + 1;
}
