import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/dashboard-queries";
import { getCurrentSeason } from "@/types/season";

/**
 * API Friends Compare: Comparer ses stats avec un ami
 * GET /api/friends/[id]/compare
 *
 * Vérif ie que les deux utilisateurs sont amis
 * Récupère les stats des deux et calcule les différences
 *
 * Protégé: Authentification requise + amitié vérifiée
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const userId = session.user.id;
    const { id: friendId } = await params;

    // 1. Vérifier qu'on est amis (FriendRequest avec status ACCEPTED)
    const areFriends = await prisma.friendRequest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!areFriends) {
      return NextResponse.json(
        { error: "Not friends - You can only compare stats with friends" },
        { status: 403 }
      );
    }

    // 2. Récupérer les stats des deux utilisateurs en parallèle (saison en cours, comme le classement)
    const season = getCurrentSeason();
    const [myStats, friendStats, friend] = await Promise.all([
      getUserStats(userId, season),
      getUserStats(friendId, season),
      prisma.user.findUnique({
        where: { id: friendId },
        select: {
          id: true,
          name: true,
          image: true,
        },
      }),
    ]);

    if (!friend) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    // 3. Calculer les différences (vous - ami)
    const differences = {
      points: myStats.totalPoints - friendStats.totalPoints,
      winRate: Math.round((myStats.winRate - friendStats.winRate) * 10) / 10,
      wonPredictions: myStats.wonPredictions - friendStats.wonPredictions,
      totalPredictions:
        myStats.totalPredictions - friendStats.totalPredictions,
    };

    return NextResponse.json({
      success: true,
      comparison: {
        me: {
          ...myStats,
          user: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          },
        },
        friend: {
          ...friendStats,
          user: {
            id: friend.id,
            name: friend.name,
            image: friend.image,
          },
        },
        differences,
      },
    });
  } catch (error) {
    console.error("[API Friends Compare] Error:", error);

    return NextResponse.json(
      {
        error: "Error comparing stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
