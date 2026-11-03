import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/competitions
 * Récupère toutes les compétitions (actives et passées)
 */
export async function GET() {
  try {
    const competitions = await prisma.competitionSeason.findMany({
      orderBy: [
        { isActive: "desc" }, // Actives en premier
        { startDate: "desc" }, // Puis par date décroissante
      ],
    });

    return NextResponse.json({
      success: true,
      competitions,
    });
  } catch (error) {
    console.error("[API] Erreur lors de la récupération des compétitions:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
