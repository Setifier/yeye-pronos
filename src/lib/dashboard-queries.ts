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
  // Bonus stats
  marginBonusCount: number;
  marginBonusPoints: number;
  topScorerBonusCount: number;
  topScorerBonusPoints: number;
  comboBonusCount: number;
  comboBonusPoints: number;
  // Les « compétitions » ne sont pas en place (bêta) : rien à afficher ni à calculer.
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
  marginBonusPoints: number;
  topScorerBonusPoints: number;
  comboBonusPoints: number;
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
 * Statistiques des pronos match d'un utilisateur.
 * `season` (ex. "2026-27") : uniquement les matchs de cette saison, comme le classement. Sans : toutes saisons.
 * Les pronos annulés (match annulé) ne comptent pas.
 */
export async function getUserStats(userId: string, season?: string): Promise<UserStats> {
  const scope = {
    userId,
    result: { not: PredictionResult.CANCELLED },
    ...(season ? { game: { season } } : {}),
  };

  // 1. Compter les pronos par résultat
  const predictionCounts = await prisma.prediction.groupBy({
    by: ["result"],
    where: scope,
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

  // 2b. Agréger les bonus
  const [bonusSums, marginBonusCount, topScorerBonusCount, comboBonusCount] =
    await Promise.all([
      prisma.prediction.aggregate({
        where: scope,
        _sum: {
          marginBonusPoints: true,
          topScorerBonusPoints: true,
          comboBonusPoints: true,
        },
      }),
      prisma.prediction.count({
        where: { ...scope, marginBonusPoints: { gt: 0 } },
      }),
      prisma.prediction.count({
        where: { ...scope, topScorerBonusPoints: { gt: 0 } },
      }),
      prisma.prediction.count({
        where: { ...scope, comboBonusPoints: { gt: 0 } },
      }),
    ]);

  return {
    totalPredictions,
    wonPredictions,
    lostPredictions,
    pendingPredictions,
    winRate,
    totalPoints,
    marginBonusCount,
    marginBonusPoints: bonusSums._sum.marginBonusPoints || 0,
    topScorerBonusCount,
    topScorerBonusPoints: bonusSums._sum.topScorerBonusPoints || 0,
    comboBonusCount,
    comboBonusPoints: bonusSums._sum.comboBonusPoints || 0,
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
    where: {
      userId,
      result: { not: PredictionResult.PENDING },
    },
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
      marginBonusPoints: prediction.marginBonusPoints,
      topScorerBonusPoints: prediction.topScorerBonusPoints,
      comboBonusPoints: prediction.comboBonusPoints,
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
