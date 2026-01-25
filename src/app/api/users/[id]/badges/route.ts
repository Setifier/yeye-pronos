import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Récupérer tous les badges
    const allBadges = await prisma.badge.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Récupérer les badges débloqués par l'utilisateur
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: id },
      include: {
        badge: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    // Créer un Set des IDs de badges débloqués
    const unlockedBadgeIds = new Set(
      userBadges.map((ub) => ub.badge.id)
    );

    // Mapper tous les badges avec leur statut de déblocage
    const badges = allBadges.map((badge) => {
      const userBadge = userBadges.find((ub) => ub.badge.id === badge.id);
      const isUnlocked = unlockedBadgeIds.has(badge.id);

      return {
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        type: badge.type,
        rarity: badge.rarity,
        reward: badge.reward,
        isUnlocked,
        unlockedAt: userBadge?.unlockedAt || null,
        progress: userBadge?.progress || 0,
        requirement: badge.requirement,
      };
    });

    // Calculer les statistiques
    const totalBadges = allBadges.length;
    const unlockedBadges = userBadges.length;
    const percentage = Math.round((unlockedBadges / totalBadges) * 100);

    const stats = {
      total: totalBadges,
      unlocked: unlockedBadges,
      percentage,
      byRarity: {
        COMMON: {
          total: allBadges.filter((b) => b.rarity === "COMMON").length,
          unlocked: badges.filter(
            (b) => b.rarity === "COMMON" && b.isUnlocked
          ).length,
        },
        RARE: {
          total: allBadges.filter((b) => b.rarity === "RARE").length,
          unlocked: badges.filter(
            (b) => b.rarity === "RARE" && b.isUnlocked
          ).length,
        },
        EPIC: {
          total: allBadges.filter((b) => b.rarity === "EPIC").length,
          unlocked: badges.filter(
            (b) => b.rarity === "EPIC" && b.isUnlocked
          ).length,
        },
        LEGENDARY: {
          total: allBadges.filter((b) => b.rarity === "LEGENDARY").length,
          unlocked: badges.filter(
            (b) => b.rarity === "LEGENDARY" && b.isUnlocked
          ).length,
        },
      },
      byCategory: {
        SEASON: {
          total: allBadges.filter((b) => b.category === "SEASON").length,
          unlocked: badges.filter(
            (b) => b.category === "SEASON" && b.isUnlocked
          ).length,
        },
        END_SEASON: {
          total: allBadges.filter((b) => b.category === "END_SEASON").length,
          unlocked: badges.filter(
            (b) => b.category === "END_SEASON" && b.isUnlocked
          ).length,
        },
        CAREER: {
          total: allBadges.filter((b) => b.category === "CAREER").length,
          unlocked: badges.filter(
            (b) => b.category === "CAREER" && b.isUnlocked
          ).length,
        },
      },
    };

    return NextResponse.json({
      badges,
      stats,
    });
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch user badges" },
      { status: 500 }
    );
  }
}
