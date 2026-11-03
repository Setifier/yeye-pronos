import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSeasonRanking } from "@/lib/season-ranking";
import { getCurrentSeason } from "@/types/season";

export const dynamic = "force-dynamic";

/**
 * GET /api/classement?season=2026-27   (défaut : saison en cours)
 * GET /api/classement?season=all       (toutes saisons)
 *
 * Points = pronos match de la saison + paris de saison.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const seasonParam = request.nextUrl.searchParams.get("season");
    const season = seasonParam === "all" ? "all" : seasonParam ?? getCurrentSeason();

    const [ranking, seasons] = await Promise.all([
      getSeasonRanking(prisma, season),
      prisma.game.findMany({ distinct: ["season"], select: { season: true }, orderBy: { season: "desc" } }),
    ]);

    const leaderboard = ranking.map((r) => ({
      rank:               r.rank,
      id:                 r.userId,
      name:               r.name,
      image:              r.image,
      totalPredictions:   r.predictions,
      wonPredictions:     r.won,
      lostPredictions:    r.lost,
      pendingPredictions: r.pending,
      totalPoints:        r.points,
      matchPoints:        r.matchPoints,
      specialPoints:      r.specialPoints,
      winRate:            r.winRate,
      isCurrentUser:      session?.user ? r.userId === session.user.id : false,
    }));

    return NextResponse.json({
      season,
      seasons: seasons.map((s) => s.season),
      leaderboard,
      currentUserRank: session?.user ? leaderboard.find((u) => u.id === session.user.id)?.rank ?? null : null,
      totalPlayers: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération du classement" }, { status: 500 });
  }
}
