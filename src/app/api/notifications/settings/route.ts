import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/settings
 * Récupérer les paramètres de notification de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Check session auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;

    // Récupérer ou créer les paramètres
    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    // Si pas de paramètres, créer avec les valeurs par défaut
    if (!settings) {
      settings = await prisma.userNotificationSettings.create({
        data: {
          userId,
          // Les valeurs par défaut sont définies dans le schéma Prisma
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des paramètres" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/settings
 * Mettre à jour les paramètres de notification
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check session auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation des champs
    const allowedFields = [
      "dailyEmailEnabled",
      "emailIncludeMissing",
      "emailIncludeResults",
      "emailIncludeRanking",
      "emailFrequency",
      "notifFriendRequest",
      "notifLeagueInvitation",
      "notifLeagueStarted",
      "notifGameFinished",
      "notifPronoWon",
      "notifPronoLost",
      "notifRankingUp",
      "notifRankingDown",
      "notifBadgeUnlocked",
      "notifStreakWarning",
      "notifSomeonePassedYou",
      "notifReminderNoProno",
      "pushEnabled",
      "pushSubscription",
    ];

    // Filtrer les champs non autorisés
    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Mettre à jour ou créer les paramètres
    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des paramètres" },
      { status: 500 }
    );
  }
}
