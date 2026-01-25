import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Admin: Monitoring des matchs
 * GET /api/admin/games
 *
 * Query params:
 * - status: "LIVE" | "FINAL" | "SCHEDULED" (filtre par statut)
 * - date: "2025-01-05" (filtre par date)
 * - limit: number (défaut 50)
 *
 * Retourne la liste des matchs avec:
 * - Infos du match (teams, scores, status, date)
 * - Compteur de pronos
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

    // Récupérer les paramètres
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construire les conditions de filtrage
    const where: any = {};

    if (status && ["LIVE", "FINAL", "SCHEDULED"].includes(status)) {
      where.status = status;
    }

    if (date) {
      const startDate = new Date(`${date}T00:00:00Z`);
      const endDate = new Date(`${date}T23:59:59Z`);
      where.localGameDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Récupérer les matchs avec infos teams + compteur pronos
    const games = await prisma.game.findMany({
      where,
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            city: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            city: true,
          },
        },
        _count: {
          select: { predictions: true },
        },
      },
      orderBy: { gameDate: "desc" },
      take: limit,
    });

    // Formater les résultats
    const formattedGames = games.map((game) => ({
      id: game.id,
      gameDate: game.gameDate,
      localGameDate: game.localGameDate,
      status: game.status,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      predictions: game._count.predictions,
    }));

    return NextResponse.json({
      success: true,
      games: formattedGames,
      total: formattedGames.length,
    });
  } catch (error) {
    console.error("[API Admin Games] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching games",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
