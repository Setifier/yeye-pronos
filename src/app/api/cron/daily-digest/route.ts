/**
 * CRON Job: Envoi du digest hebdomadaire par email
 * URL: /api/cron/daily-digest
 * Fréquence: Tous les lundis à 9h (Paris) = 8h UTC
 *
 * Config Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-digest",
 *     "schedule": "0 8 * * 1"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigest } from "@/lib/email-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Vérifier le secret CRON
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Daily Digest: Début de l'envoi des emails...");

    // Récupérer tous les utilisateurs avec email quotidien activé
    const usersWithDigest = await prisma.user.findMany({
      where: {
        notificationSettings: {
          dailyEmailEnabled: true,
        },
      },
      include: {
        notificationSettings: true,
      },
    });

    console.log(`[CRON] ${usersWithDigest.length} utilisateur(s) avec digest activé`);

    let emailsSent = 0;
    let emailsFailed = 0;

    // Pour chaque utilisateur, générer et envoyer le digest
    for (const user of usersWithDigest) {
      try {
        // Vérifier la fréquence d'envoi
        const frequency = user.notificationSettings?.emailFrequency || "DAILY";
        const today = new Date().getDay(); // 0 = Dimanche, 1 = Lundi, etc.

        if (frequency === "DISABLED") {
          continue;
        }

        if (frequency === "WEEKDAYS" && (today === 0 || today === 6)) {
          // Pas d'email le week-end si WEEKDAYS
          continue;
        }

        if (frequency === "WEEKLY" && today !== 1) {
          // Email uniquement le lundi si WEEKLY
          continue;
        }

        // Générer les données du digest
        const digestData = await generateDigestData(user.id, user.notificationSettings);

        // Vérifier s'il y a du contenu à envoyer
        const hasContent =
          (digestData.missingPredictions && digestData.missingPredictions.count > 0) ||
          digestData.yesterdayResults ||
          digestData.rankingChange ||
          (digestData.achievements && digestData.achievements.length > 0);

        if (!hasContent) {
          console.log(`[CRON] Pas de contenu pour ${user.email}, skip`);
          continue;
        }

        // Envoyer l'email
        const result = await sendDailyDigest({
          email: user.email,
          userName: user.name,
          data: digestData,
        });

        if (result.success) {
          emailsSent++;
          console.log(`[CRON] ✅ Email envoyé à ${user.email}`);
        } else {
          emailsFailed++;
          console.error(`[CRON] ❌ Échec envoi à ${user.email}`);
        }

        // Attendre 100ms entre chaque email pour éviter le rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        emailsFailed++;
        console.error(`[CRON] Erreur pour ${user.email}:`, error);
      }
    }

    console.log(`[CRON] Daily Digest terminé: ${emailsSent} envoyés, ${emailsFailed} échoués`);

    return NextResponse.json({
      success: true,
      emailsSent,
      emailsFailed,
      totalUsers: usersWithDigest.length,
    });
  } catch (error) {
    console.error("[CRON] Erreur Daily Digest:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des emails" },
      { status: 500 }
    );
  }
}

/**
 * Générer les données pour le digest d'un utilisateur
 */
async function generateDigestData(userId: string, settings: any) {
  const data: any = {
    userName: "",
  };

  // 1. Pronos manquants (toujours inclus si activé)
  if (settings?.emailIncludeMissing !== false) {
    const missingPredictions = await getMissingPredictions(userId);
    if (missingPredictions) {
      data.missingPredictions = missingPredictions;
    }
  }

  // 2. Résultats d'hier (si activé)
  if (settings?.emailIncludeResults !== false) {
    const yesterdayResults = await getYesterdayResults(userId);
    if (yesterdayResults) {
      data.yesterdayResults = yesterdayResults;
    }
  }

  // 3. Évolution classement (si activé)
  if (settings?.emailIncludeRanking !== false) {
    const rankingChange = await getRankingChange(userId);
    if (rankingChange) {
      data.rankingChange = rankingChange;
    }
  }

  // 4. Nouveaux badges (si activé)
  // TODO: Implémenter quand le système de badges sera actif
  // const achievements = await getNewBadges(userId);
  // if (achievements && achievements.length > 0) {
  //   data.achievements = achievements;
  // }

  return data;
}

/**
 * Récupérer les pronos manquants pour aujourd'hui
 */
async function getMissingPredictions(userId: string) {
  // Date du jour en Eastern Time (pour matcher les matchs NBA)
  const today = new Date();
  const todayUS = today.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = todayUS.split("/");
  const formattedDate = `${year}-${month}-${day}`;

  // Récupérer les matchs d'aujourd'hui
  const todaysGames = await prisma.game.findMany({
    where: {
      localGameDate: {
        gte: new Date(`${formattedDate}T00:00:00Z`),
        lt: new Date(`${formattedDate}T23:59:59Z`),
      },
      status: "SCHEDULED",
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { userId },
      },
    },
  });

  // Filtrer les matchs sans prono
  const gamesWithoutPredictions = todaysGames.filter((game) => game.predictions.length === 0);

  if (gamesWithoutPredictions.length === 0) {
    return null;
  }

  return {
    count: gamesWithoutPredictions.length,
    games: gamesWithoutPredictions.slice(0, 5).map((game) => ({
      homeTeam: game.homeTeam.abbreviation,
      awayTeam: game.awayTeam.abbreviation,
      time: game.gameDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      }),
    })),
  };
}

/**
 * Récupérer les résultats de la semaine écoulée (lundi à dimanche)
 */
async function getYesterdayResults(userId: string) {
  // Calculer la période : du lundi dernier (8 jours avant) au dimanche (hier)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi
  const daysToLastMonday = dayOfWeek === 1 ? 7 : dayOfWeek === 0 ? 8 : dayOfWeek + 6;

  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToLastMonday);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  // Récupérer les pronos de la semaine écoulée
  const weekPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      game: {
        localGameDate: {
          gte: lastMonday,
          lte: lastSunday,
        },
        status: "FINAL",
      },
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
      createdAt: "desc",
    },
  });

  if (weekPredictions.length === 0) {
    return null;
  }

  const won = weekPredictions.filter((p) => p.result === "WON").length;
  const lost = weekPredictions.filter((p) => p.result === "LOST").length;
  const totalPoints = weekPredictions.reduce((sum, p) => sum + p.pointsEarned, 0);

  return {
    won,
    lost,
    totalPoints,
    games: weekPredictions.slice(0, 8).map((pred) => ({
      homeTeam: pred.game.homeTeam.abbreviation,
      awayTeam: pred.game.awayTeam.abbreviation,
      homeScore: pred.game.homeScore || 0,
      awayScore: pred.game.awayScore || 0,
      prediction: pred.predictedTeamId === pred.game.homeTeamId ? "HOME" : "AWAY",
      result: pred.result as "WON" | "LOST",
    })),
  };
}

/**
 * Récupérer l'évolution du classement
 */
async function getRankingChange(userId: string) {
  // Calculer le classement actuel
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

  const currentRank = allUsers.findIndex((u) => u.userId === userId) + 1;

  if (currentRank === 0) {
    return null; // Utilisateur pas dans le classement
  }

  // Calculer les stats
  const userPredictions = await prisma.prediction.findMany({
    where: { userId },
  });

  const totalPoints = userPredictions.reduce((sum, p) => sum + p.pointsEarned, 0);
  const totalGames = userPredictions.filter((p) => p.result !== "PENDING").length;
  const wonGames = userPredictions.filter((p) => p.result === "WON").length;
  const winRate = totalGames > 0 ? Math.round((wonGames / totalGames) * 100) : 0;

  // TODO: Stocker le classement d'hier pour calculer la vraie évolution
  // Pour l'instant, on simule
  const oldRank = currentRank; // Pas de changement pour l'instant

  return {
    oldRank,
    newRank: currentRank,
    totalPoints,
    winRate,
  };
}
