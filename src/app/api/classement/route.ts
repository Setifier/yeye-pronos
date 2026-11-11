import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSeasonBonusTotals, getSeasonRanking, NO_BONUS } from "@/lib/season-ranking";
import type { BoardPlayer } from "@/lib/ranking-boards";
import { getCurrentSeason } from "@/types/season";

export const dynamic = "force-dynamic";

/**
 * Joueurs classés d'une saison, avec tout ce qu'il faut pour les 5 classements
 * (points, réussite, bons écarts, meilleur marqueur, combo ultime : tri dans src/lib/ranking-boards.ts).
 *
 * GET /api/classement                 → saison en cours (page Classement)
 * GET /api/classement?season=2025-26  → saison passée (Archives)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const current = getCurrentSeason();
    const asked = request.nextUrl.searchParams.get("season");
    const season = asked && /^\d{4}-\d{2}$/.test(asked) ? asked : current;

    const [ranking, bonus] = await Promise.all([
      getSeasonRanking(prisma, season),
      getSeasonBonusTotals(prisma, season),
    ]);

    const players: BoardPlayer[] = ranking.map((r) => ({
      id:            r.userId,
      name:          r.name,
      image:         r.image,
      isCurrentUser: session?.user ? r.userId === session.user.id : false,
      points:        r.points,
      matchPoints:   r.matchPoints,
      specialPoints: r.specialPoints,
      won:           r.won,
      lost:          r.lost,
      winRate:       r.winRate,
      ...(bonus.get(r.userId) ?? NO_BONUS),
    }));

    return NextResponse.json({ season, isCurrent: season === current, players });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération du classement" }, { status: 500 });
  }
}
