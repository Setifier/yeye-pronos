import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNightComparison, getPlayerNights } from "@/lib/player-bets";
import { getSeasonRanking } from "@/lib/season-ranking";
import { getCurrentSeason } from "@/types/season";

/**
 * Pronos TERMINÉS d'un joueur pour une nuit, à côté des miens (bonus compris).
 * GET /api/users/[id]/bets?season=2025-26&night=YYYY-MM-DD — sans `season` : saison en cours ;
 * sans `night` : sa dernière nuit avec des pronos notés.
 * Connexion requise. Jamais de prono sur un match pas encore joué.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    }
    const viewerId = session.user.id;
    const { id: targetId } = await params;

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true, image: true } });
    if (!target) return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });

    const asked = request.nextUrl.searchParams.get("season");
    const season = asked && /^\d{4}-\d{2}$/.test(asked) ? asked : getCurrentSeason();
    const [nights, ranking] = await Promise.all([
      getPlayerNights(prisma, targetId, viewerId, season),
      getSeasonRanking(prisma, season),
    ]);

    const wanted = request.nextUrl.searchParams.get("night");
    const night = wanted && nights.some((n) => n.date === wanted) ? wanted : nights[0]?.date ?? null;
    const games = night ? await getNightComparison(prisma, targetId, viewerId, night) : [];

    const entryOf = (userId: string) => {
      const e = ranking.find((r) => r.userId === userId);
      return { rank: e?.rank ?? null, points: e?.points ?? 0 };
    };
    const me = await prisma.user.findUnique({ where: { id: viewerId }, select: { id: true, name: true, image: true } });

    return NextResponse.json({
      season,
      isMe: viewerId === targetId,
      player: { ...target, ...entryOf(targetId) },
      me: me ? { ...me, ...entryOf(viewerId) } : null,
      totalPlayers: ranking.length,
      nights,
      night,
      games,
    });
  } catch (error) {
    console.error("[API users/bets]", error);
    return NextResponse.json({ error: "Impossible de charger les pronos" }, { status: 500 });
  }
}
