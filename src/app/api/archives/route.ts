import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

/**
 * GET /api/archives
 * Retourne la liste des saisons archivées (toutes sauf la saison en cours)
 */
export async function GET() {
  try {
    const currentSeason = getCurrentSeason();

    // Récupérer toutes les saisons distinctes
    const allSeasons = await prisma.game.findMany({
      where: {
        season: { not: currentSeason },
      },
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    });

    // Pour chaque saison archivée, compter les matchs et pronos
    const seasons = await Promise.all(
      allSeasons.map(async ({ season }) => {
        const [totalGames, totalPredictions] = await Promise.all([
          prisma.game.count({ where: { season } }),
          prisma.prediction.count({
            where: { game: { season } },
          }),
        ]);

        return { season, totalGames, totalPredictions };
      })
    );

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("[ARCHIVES] Error:", error);
    return NextResponse.json({ seasons: [] });
  }
}
