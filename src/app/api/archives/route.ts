import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSeasonRanking } from "@/lib/season-ranking";
import { getCurrentSeason } from "@/types/season";

export const dynamic = "force-dynamic";

/**
 * GET /api/archives
 * Saisons terminées (toutes sauf la saison en cours) : matchs, pronos, joueurs classés et champion.
 * Le détail des classements d'une saison : /archives/[saison] (← GET /api/classement?season=…).
 */
export async function GET() {
  try {
    const currentSeason = getCurrentSeason();

    const allSeasons = await prisma.game.findMany({
      where: { season: { not: currentSeason } },
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    });

    const seasons = await Promise.all(
      allSeasons.map(async ({ season }) => {
        const [totalGames, totalPredictions, ranking] = await Promise.all([
          prisma.game.count({ where: { season } }),
          prisma.prediction.count({ where: { game: { season } } }),
          getSeasonRanking(prisma, season),
        ]);
        const first = ranking[0];
        return {
          season,
          totalGames,
          totalPredictions,
          players: ranking.length,
          champion: first ? { name: first.name, image: first.image, points: first.points } : null,
        };
      })
    );

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("[ARCHIVES] Error:", error);
    return NextResponse.json({ seasons: [] });
  }
}
