import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Admin: Stats globales
 * GET /api/admin/stats
 *
 * Retourne les statistiques globales de l'application:
 * - Total users, actifs aujourd'hui, par rôle
 * - Total pronos, par statut (WON, LOST, PENDING)
 * - Total matchs
 *
 * Protégé: ADMIN uniquement
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Date du jour (minuit)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Compter en parallèle
    const [
      totalUsers,
      totalPredictions,
      totalGames,
      activeToday,
      predictionsByStatus,
      usersByRole,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total pronos
      prisma.prediction.count(),

      // Total matchs
      prisma.game.count(),

      // Users actifs aujourd'hui (ayant fait au moins 1 prono)
      prisma.user.count({
        where: {
          predictions: {
            some: {
              createdAt: {
                gte: startOfToday,
              },
            },
          },
        },
      }),

      // Pronos par statut
      prisma.prediction.groupBy({
        by: ["result"],
        _count: true,
      }),

      // Users par rôle
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
    ]);

    // Formater les résultats
    const predictionStats = {
      total: totalPredictions,
      byStatus: {
        PENDING:
          predictionsByStatus.find((p) => p.result === "PENDING")?._count || 0,
        WON: predictionsByStatus.find((p) => p.result === "WON")?._count || 0,
        LOST: predictionsByStatus.find((p) => p.result === "LOST")?._count || 0,
      },
    };

    const userStats = {
      total: totalUsers,
      activeToday,
      byRole: {
        USER: usersByRole.find((u) => u.role === "USER")?._count || 0,
        ADMIN: usersByRole.find((u) => u.role === "ADMIN")?._count || 0,
      },
    };

    return NextResponse.json({
      success: true,
      users: userStats,
      predictions: predictionStats,
      games: { total: totalGames },
    });
  } catch (error) {
    console.error("[API Admin Stats] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching admin stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
