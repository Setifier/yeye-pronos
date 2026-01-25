import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserStats, getUserRank } from "@/lib/dashboard-queries";
import { PredictionResult } from "@/generated/prisma";

/**
 * API Users: Profil public d'un utilisateur
 * GET /api/users/[id]/public-profile
 *
 * Retourne le profil public d'un utilisateur avec:
 * - Informations de base (nom, image, date d'inscription)
 * - Statistiques globales
 * - Derniers pronos terminés (WON/LOST uniquement, pas de PENDING pour éviter les spoilers)
 * - Badges débloqués
 * - Rang au classement
 *
 * Protégé: Authentification requise
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const targetUserId = params.id;

    // 1. Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        favoriteTeam: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
            logoUrl: true,
          },
        },
        favoritePlayer: {
          select: {
            id: true,
            fullName: true,
            position: true,
            jerseyNumber: true,
            team: {
              select: {
                id: true,
                abbreviation: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Récupérer les stats (réutiliser getUserStats)
    const stats = await getUserStats(targetUserId);

    // 3. Récupérer les derniers pronos TERMINÉS uniquement (WON/LOST, pas PENDING)
    const recentPredictions = await prisma.prediction.findMany({
      where: {
        userId: targetUserId,
        result: {
          in: [PredictionResult.WON, PredictionResult.LOST],
        },
      },
      include: {
        game: {
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                city: true,
                abbreviation: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                city: true,
                abbreviation: true,
              },
            },
          },
        },
      },
      orderBy: {
        game: {
          gameDate: "desc",
        },
      },
      take: 10,
    });

    // Formater les predictions
    const formattedPredictions = recentPredictions.map((prediction) => {
      const predictedTeam =
        prediction.predictedTeamId === prediction.game.homeTeamId
          ? prediction.game.homeTeam
          : prediction.game.awayTeam;

      return {
        id: prediction.id,
        gameId: prediction.gameId,
        gameDate: prediction.game.gameDate,
        homeTeam: prediction.game.homeTeam,
        awayTeam: prediction.game.awayTeam,
        predictedTeam,
        result: prediction.result,
        pointsEarned: prediction.pointsEarned,
        finalScore: {
          home: prediction.game.homeScore,
          away: prediction.game.awayScore,
        },
      };
    });

    // 4. Récupérer les badges
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: targetUserId },
      include: {
        badge: true,
      },
      orderBy: {
        unlockedAt: "desc",
      },
    });

    // 5. Récupérer le rang au classement
    const rank = await getUserRank(targetUserId);

    return NextResponse.json({
      success: true,
      profile: {
        user,
        stats,
        recentPredictions: formattedPredictions,
        badges: userBadges,
        rank,
      },
    });
  } catch (error) {
    console.error("[API Users Public Profile] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching public profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
