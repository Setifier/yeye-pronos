import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBadgeProgress } from "@/lib/badge-service";

/**
 * GET /api/badges/user
 * Récupérer les badges d'un utilisateur avec progression
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Récupérer les badges obtenus par l'utilisateur
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: {
        unlockedAt: "desc",
      },
    });

    // Récupérer tous les badges disponibles
    const allBadges = await prisma.badge.findMany({
      orderBy: [
        { category: "asc" },
        { type: "asc" },
        { difficultyLevel: "asc" },
      ],
    });

    // Calculer la progression pour chaque badge
    const badgesWithProgress = await Promise.all(
      allBadges.map(async (badge) => {
        const userBadge = userBadges.find((ub) => ub.badgeId === badge.id);
        const isUnlocked = !!userBadge;

        let progress = 0;
        if (!isUnlocked) {
          try {
            progress = await getBadgeProgress(userId, badge.id);
          } catch (error) {
            console.error(`Error calculating progress for badge ${badge.id}:`, error);
          }
        }

        return {
          ...badge,
          isUnlocked,
          unlockedAt: userBadge?.unlockedAt || null,
          progress: isUnlocked ? 100 : progress,
        };
      })
    );

    // Grouper par catégorie
    const grouped = {
      SEASON: badgesWithProgress.filter((b) => b.category === "SEASON"),
      END_SEASON: badgesWithProgress.filter((b) => b.category === "END_SEASON"),
      CAREER: badgesWithProgress.filter((b) => b.category === "CAREER"),
    };

    // Statistiques
    const stats = {
      total: allBadges.length,
      unlocked: userBadges.length,
      locked: allBadges.length - userBadges.length,
      percentage: Math.round((userBadges.length / allBadges.length) * 100),
      byCategory: {
        SEASON: {
          total: grouped.SEASON.length,
          unlocked: grouped.SEASON.filter((b) => b.isUnlocked).length,
        },
        END_SEASON: {
          total: grouped.END_SEASON.length,
          unlocked: grouped.END_SEASON.filter((b) => b.isUnlocked).length,
        },
        CAREER: {
          total: grouped.CAREER.length,
          unlocked: grouped.CAREER.filter((b) => b.isUnlocked).length,
        },
      },
    };

    return NextResponse.json({
      badges: badgesWithProgress,
      grouped,
      stats,
      recentlyUnlocked: userBadges.slice(0, 5).map((ub) => ({
        ...ub.badge,
        unlockedAt: ub.unlockedAt,
      })),
    });
  } catch (error) {
    console.error("[API] Error fetching user badges:", error);
    return NextResponse.json(
      { error: "Error fetching user badges" },
      { status: 500 }
    );
  }
}
