import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API Player Search: Recherche de joueurs par nom
 * GET /api/players/search?q=xxx
 *
 * Utilisé pour l'autocomplete lors de la sélection du joueur favori
 * dans l'onboarding et les paramètres utilisateur.
 *
 * Query params:
 * - q: Recherche (min 2 caractères)
 *
 * Returns: Liste de max 10 joueurs avec leurs équipes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    // Validation: min 2 caractères
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "La recherche doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    // Recherche des joueurs avec leur équipe
    const players = await prisma.player.findMany({
      where: {
        fullName: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            logoUrl: true,
          },
        },
      },
      take: 10,
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({
      success: true,
      players: players.map((player) => ({
        id: player.id,
        fullName: player.fullName,
        position: player.position,
        jerseyNumber: player.jerseyNumber,
        headshot: player.headshot,
        team: player.team
          ? {
              id: player.team.id,
              name: player.team.name,
              abbreviation: player.team.abbreviation,
              logoUrl: player.team.logoUrl,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("[API Players Search] Error:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la recherche de joueurs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
