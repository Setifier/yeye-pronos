/**
 * Service de détection et attribution des badges
 *
 * Ce service contient la logique pour :
 * - Détecter quand un utilisateur a gagné un nouveau badge
 * - Attribuer les badges aux utilisateurs
 * - Calculer la progression vers les badges
 */

import { prisma } from "@/lib/prisma";
import { BadgeCategory, PredictionResult } from "@/generated/prisma";

/**
 * Vérifier et attribuer tous les badges gagnés par un utilisateur
 * Appelé après chaque nouveau prono ou fin de match
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const newBadges: string[] = [];

  // Récupérer tous les badges disponibles (sauf END_SEASON qui sont distribués manuellement)
  const availableBadges = await prisma.badge.findMany({
    where: {
      category: {
        in: ["SEASON", "CAREER"],
      },
    },
  });

  // Récupérer les badges déjà obtenus par l'utilisateur
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));

  // Vérifier chaque badge
  for (const badge of availableBadges) {
    // Skip si déjà obtenu
    if (earnedBadgeIds.has(badge.id)) {
      continue;
    }

    // Vérifier si les critères sont remplis
    const earned = await checkBadgeCriteria(userId, badge.criteria);

    if (earned) {
      // Attribuer le badge
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
      });

      newBadges.push(badge.id);
      console.log(`🏆 Badge obtenu : ${badge.name} par user ${userId}`);
    }
  }

  return newBadges;
}

/**
 * Vérifier si un utilisateur remplit les critères d'un badge
 */
async function checkBadgeCriteria(userId: string, criteria: any): Promise<boolean> {
  const type = criteria.type;

  switch (type) {
    // ============================================
    // VOLUME - Nombre de victoires
    // ============================================
    case "wins":
      return checkWinCount(userId, criteria.count, criteria.scope || "season");

    case "wins_total":
      return checkWinCountTotal(userId, criteria.count);

    case "favorite_team_wins":
      return checkFavoriteTeamWins(userId, criteria.count);

    case "favorite_team_losses":
      return checkFavoriteTeamLosses(userId, criteria.count);

    // ============================================
    // STREAK - Séries consécutives
    // ============================================
    case "streak":
      return checkWinStreak(userId, criteria.count);

    case "loss_streak":
      return checkLossStreak(userId, criteria.count);

    case "favorite_team_streak":
      return checkFavoriteTeamStreak(userId, criteria.count);

    // ============================================
    // ACCURACY - Taux de réussite
    // ============================================
    case "daily_perfect":
      return checkDailyPerfect(userId, criteria.minGames);

    case "daily_winrate":
      return checkDailyWinrate(userId, criteria.rate, criteria.minGames);

    case "daily_winrate_low":
      return checkDailyWinrateLow(userId, criteria.rate, criteria.minGames);

    case "daily_all_lost":
      return checkDailyAllLost(userId, criteria.minGames);

    case "weekly_winrate":
      return checkWeeklyWinrate(userId, criteria.rate, criteria.minGames);

    case "weekly_winrate_low":
      return checkWeeklyWinrateLow(userId, criteria.rate, criteria.minGames);

    case "monthly_winrate":
      return checkMonthlyWinrate(userId, criteria.rate, criteria.minGames);

    case "season_winrate":
      return checkSeasonWinrate(userId, criteria.rate, criteria.minGames, criteria.excludePlayoffs);

    case "season_winrate_low":
      return checkSeasonWinrateLow(userId, criteria.rate, criteria.minGames, criteria.excludePlayoffs);

    case "season_favorite_winrate":
      return checkSeasonFavoriteWinrate(userId, criteria.rate, criteria.minGames, criteria.excludePlayoffs);

    case "season_favorite_winrate_low":
      return checkSeasonFavoriteWinrateLow(userId, criteria.rate, criteria.minGames, criteria.excludePlayoffs);

    // ============================================
    // SPECIAL - Achievements spéciaux
    // ============================================
    case "championships_won":
      return checkChampionshipsWon(userId, criteria.count);

    case "public_competitions_won":
      return checkPublicCompetitionsWon(userId, criteria.count);

    case "private_competitions_won":
      return checkPrivateCompetitionsWon(userId, criteria.count, criteria.minPlayers);

    case "seasons_participated":
      return checkSeasonsParticipated(userId, criteria.count);

    case "top10_seasons":
      return checkTop10Seasons(userId, criteria.count);

    default:
      console.warn(`Type de critère non supporté : ${type}`);
      return false;
  }
}

// ============================================
// HELPERS - Volume
// ============================================

/**
 * Vérifier le nombre de victoires (saison ou total)
 */
async function checkWinCount(userId: string, targetCount: number, scope: "season" | "total"): Promise<boolean> {
  if (scope === "total") {
    return checkWinCountTotal(userId, targetCount);
  }

  // Pour scope "season" - on compte les victoires de la saison en cours
  // TODO: Filtrer par saison active quand le système de saisons sera implémenté
  const wonPredictions = await prisma.prediction.count({
    where: {
      userId,
      result: "WON",
    },
  });

  return wonPredictions >= targetCount;
}

async function checkWinCountTotal(userId: string, targetCount: number): Promise<boolean> {
  const wonPredictions = await prisma.prediction.count({
    where: {
      userId,
      result: "WON",
    },
  });

  return wonPredictions >= targetCount;
}

async function checkFavoriteTeamWins(userId: string, targetCount: number): Promise<boolean> {
  // TODO: Implémenter quand le système d'équipe favorite sera ajouté
  // Pour l'instant, on retourne false
  return false;
}

async function checkFavoriteTeamLosses(userId: string, targetCount: number): Promise<boolean> {
  // TODO: Implémenter quand le système d'équipe favorite sera ajouté
  return false;
}

// ============================================
// HELPERS - Streak
// ============================================

/**
 * Vérifier la série de victoires consécutives
 */
async function checkWinStreak(userId: string, targetStreak: number): Promise<boolean> {
  // Récupérer les derniers pronos (100 max pour optimiser)
  const recentPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      result: { in: ["WON", "LOST"] },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  // Calculer la série actuelle
  let currentStreak = 0;
  for (const pred of recentPredictions) {
    if (pred.result === "WON") {
      currentStreak++;
      if (currentStreak >= targetStreak) {
        return true;
      }
    } else {
      break; // Série interrompue
    }
  }

  return false;
}

async function checkLossStreak(userId: string, targetStreak: number): Promise<boolean> {
  const recentPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      result: { in: ["WON", "LOST"] },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  let currentStreak = 0;
  for (const pred of recentPredictions) {
    if (pred.result === "LOST") {
      currentStreak++;
      if (currentStreak >= targetStreak) {
        return true;
      }
    } else {
      break;
    }
  }

  return false;
}

async function checkFavoriteTeamStreak(userId: string, targetStreak: number): Promise<boolean> {
  // TODO: Implémenter quand le système d'équipe favorite sera ajouté
  return false;
}

// ============================================
// HELPERS - Accuracy (Daily)
// ============================================

/**
 * Vérifier si l'utilisateur a fait un perfect (100%) sur une journée
 */
async function checkDailyPerfect(userId: string, minGames: number): Promise<boolean> {
  // Obtenir la date d'aujourd'hui en Eastern Time (pour matcher les matchs NBA)
  const today = new Date();
  const todayUS = today.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = todayUS.split("/");
  const dateString = `${year}-${month}-${day}`;

  const todayPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      game: {
        localGameDate: {
          gte: new Date(`${dateString}T00:00:00Z`),
          lt: new Date(`${dateString}T23:59:59Z`),
        },
        status: "FINAL",
      },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (todayPredictions.length < minGames) {
    return false;
  }

  const allWon = todayPredictions.every((p) => p.result === "WON");
  return allWon;
}

async function checkDailyWinrate(userId: string, targetRate: number, minGames: number): Promise<boolean> {
  const today = new Date();
  const todayUS = today.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = todayUS.split("/");
  const dateString = `${year}-${month}-${day}`;

  const todayPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      game: {
        localGameDate: {
          gte: new Date(`${dateString}T00:00:00Z`),
          lt: new Date(`${dateString}T23:59:59Z`),
        },
        status: "FINAL",
      },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (todayPredictions.length < minGames) {
    return false;
  }

  const wonCount = todayPredictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / todayPredictions.length) * 100;

  return winrate >= targetRate;
}

async function checkDailyWinrateLow(userId: string, maxRate: number, minGames: number): Promise<boolean> {
  const today = new Date();
  const todayUS = today.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = todayUS.split("/");
  const dateString = `${year}-${month}-${day}`;

  const todayPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      game: {
        localGameDate: {
          gte: new Date(`${dateString}T00:00:00Z`),
          lt: new Date(`${dateString}T23:59:59Z`),
        },
        status: "FINAL",
      },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (todayPredictions.length < minGames) {
    return false;
  }

  const wonCount = todayPredictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / todayPredictions.length) * 100;

  return winrate <= maxRate;
}

async function checkDailyAllLost(userId: string, minGames: number): Promise<boolean> {
  const today = new Date();
  const todayUS = today.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = todayUS.split("/");
  const dateString = `${year}-${month}-${day}`;

  const todayPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      game: {
        localGameDate: {
          gte: new Date(`${dateString}T00:00:00Z`),
          lt: new Date(`${dateString}T23:59:59Z`),
        },
        status: "FINAL",
      },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (todayPredictions.length < minGames) {
    return false;
  }

  const allLost = todayPredictions.every((p) => p.result === "LOST");
  return allLost;
}

// ============================================
// HELPERS - Accuracy (Weekly/Monthly/Season)
// ============================================

async function checkWeeklyWinrate(userId: string, targetRate: number, minGames: number): Promise<boolean> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      createdAt: { gte: weekAgo },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (weekPredictions.length < minGames) {
    return false;
  }

  const wonCount = weekPredictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / weekPredictions.length) * 100;

  return winrate >= targetRate;
}

async function checkWeeklyWinrateLow(userId: string, maxRate: number, minGames: number): Promise<boolean> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      createdAt: { gte: weekAgo },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (weekPredictions.length < minGames) {
    return false;
  }

  const wonCount = weekPredictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / weekPredictions.length) * 100;

  return winrate <= maxRate;
}

async function checkMonthlyWinrate(userId: string, targetRate: number, minGames: number): Promise<boolean> {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const monthPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      createdAt: { gte: monthAgo },
      result: { in: ["WON", "LOST"] },
    },
  });

  if (monthPredictions.length < minGames) {
    return false;
  }

  const wonCount = monthPredictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / monthPredictions.length) * 100;

  return winrate >= targetRate;
}

async function checkSeasonWinrate(
  userId: string,
  targetRate: number,
  minGames: number,
  excludePlayoffs?: boolean
): Promise<boolean> {
  // TODO: Filtrer par saison active + exclure playoffs si demandé
  // Pour l'instant, on compte toutes les prédictions
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      result: { in: ["WON", "LOST"] },
    },
  });

  if (predictions.length < minGames) {
    return false;
  }

  const wonCount = predictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / predictions.length) * 100;

  return winrate >= targetRate;
}

async function checkSeasonWinrateLow(
  userId: string,
  maxRate: number,
  minGames: number,
  excludePlayoffs?: boolean
): Promise<boolean> {
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      result: { in: ["WON", "LOST"] },
    },
  });

  if (predictions.length < minGames) {
    return false;
  }

  const wonCount = predictions.filter((p) => p.result === "WON").length;
  const winrate = (wonCount / predictions.length) * 100;

  return winrate <= maxRate;
}

async function checkSeasonFavoriteWinrate(
  userId: string,
  targetRate: number,
  minGames: number,
  excludePlayoffs?: boolean
): Promise<boolean> {
  // TODO: Implémenter avec équipe favorite
  return false;
}

async function checkSeasonFavoriteWinrateLow(
  userId: string,
  maxRate: number,
  minGames: number,
  excludePlayoffs?: boolean
): Promise<boolean> {
  // TODO: Implémenter avec équipe favorite
  return false;
}

// ============================================
// HELPERS - Special
// ============================================

async function checkChampionshipsWon(userId: string, targetCount: number): Promise<boolean> {
  // TODO: Implémenter quand le système de compétitions sera prêt
  return false;
}

async function checkPublicCompetitionsWon(userId: string, targetCount: number): Promise<boolean> {
  // TODO: Implémenter quand le système de compétitions sera prêt
  return false;
}

async function checkPrivateCompetitionsWon(
  userId: string,
  targetCount: number,
  minPlayers: number
): Promise<boolean> {
  // TODO: Implémenter quand le système de ligues privées sera prêt
  return false;
}

async function checkSeasonsParticipated(userId: string, targetCount: number): Promise<boolean> {
  // TODO: Implémenter quand le système de saisons sera prêt
  return false;
}

async function checkTop10Seasons(userId: string, targetCount: number): Promise<boolean> {
  // TODO: Implémenter quand le système de saisons sera prêt
  return false;
}

// ============================================
// DISTRIBUTION DES BADGES FIN DE SAISON
// ============================================

/**
 * Distribuer les badges de fin de saison à tous les utilisateurs
 * À appeler manuellement à la fin de chaque saison
 */
export async function distributeEndOfSeasonBadges(): Promise<void> {
  console.log("🏆 Distribution des badges de fin de saison...");

  // Récupérer tous les badges END_SEASON
  const endSeasonBadges = await prisma.badge.findMany({
    where: { category: "END_SEASON" },
  });

  // Récupérer tous les utilisateurs avec leurs stats
  const users = await prisma.user.findMany({
    include: {
      predictions: {
        where: {
          result: { in: ["WON", "LOST"] },
        },
      },
    },
  });

  // Calculer le classement
  const leaderboard = users
    .map((user) => {
      const totalPoints = user.predictions.reduce((sum, p) => sum + p.pointsEarned, 0);
      return {
        userId: user.id,
        points: totalPoints,
        predictions: user.predictions,
      };
    })
    .sort((a, b) => b.points - a.points);

  // Attribuer les badges à chaque utilisateur
  for (let i = 0; i < leaderboard.length; i++) {
    const rank = i + 1;
    const userStats = leaderboard[i];

    for (const badge of endSeasonBadges) {
      const criteria = badge.criteria as any;

      let shouldAward = false;

      // Vérifier les critères de classement
      if (criteria.type === "season_rank" && rank === criteria.rank) {
        shouldAward = true;
      } else if (criteria.type === "season_rank_range" && rank <= criteria.maxRank) {
        shouldAward = true;
      }
      // Vérifier les critères de winrate saison
      else if (criteria.type === "season_winrate") {
        const wonCount = userStats.predictions.filter((p) => p.result === "WON").length;
        const totalGames = userStats.predictions.length;
        if (totalGames >= criteria.minGames) {
          const winrate = (wonCount / totalGames) * 100;
          shouldAward = winrate >= criteria.rate;
        }
      } else if (criteria.type === "season_winrate_low") {
        const wonCount = userStats.predictions.filter((p) => p.result === "WON").length;
        const totalGames = userStats.predictions.length;
        if (totalGames >= criteria.minGames) {
          const winrate = (wonCount / totalGames) * 100;
          shouldAward = winrate <= criteria.rate;
        }
      }
      // TODO: Ajouter les autres types (favorite team, private league, etc.)

      if (shouldAward) {
        // Vérifier si le badge n'est pas déjà attribué
        const existing = await prisma.userBadge.findUnique({
          where: {
            userId_badgeId: {
              userId: userStats.userId,
              badgeId: badge.id,
            },
          },
        });

        if (!existing) {
          await prisma.userBadge.create({
            data: {
              userId: userStats.userId,
              badgeId: badge.id,
            },
          });
          console.log(`🏆 Badge "${badge.name}" attribué à user ${userStats.userId}`);
        }
      }
    }
  }

  console.log("✅ Distribution des badges de fin de saison terminée");
}

/**
 * Calculer la progression vers un badge (pourcentage)
 */
export async function getBadgeProgress(userId: string, badgeId: string): Promise<number> {
  const badge = await prisma.badge.findUnique({
    where: { id: badgeId },
  });

  if (!badge) return 0;

  const criteria = badge.criteria as any;
  const type = criteria.type;

  // Exemples de calcul de progression
  switch (type) {
    case "wins":
    case "wins_total": {
      const wonCount = await prisma.prediction.count({
        where: { userId, result: "WON" },
      });
      return Math.min((wonCount / criteria.count) * 100, 100);
    }

    case "streak": {
      const currentStreak = await getCurrentWinStreak(userId);
      return Math.min((currentStreak / criteria.count) * 100, 100);
    }

    // TODO: Ajouter d'autres types
    default:
      return 0;
  }
}

/**
 * Helper pour obtenir la série de victoires actuelle
 */
async function getCurrentWinStreak(userId: string): Promise<number> {
  const recentPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      result: { in: ["WON", "LOST"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let streak = 0;
  for (const pred of recentPredictions) {
    if (pred.result === "WON") {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
