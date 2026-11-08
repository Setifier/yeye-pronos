import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadBetGames } from "@/lib/bet-games";
import { getSeasonRanking } from "@/lib/season-ranking";
import { getCurrentNightDate } from "@/lib/game-night";
import { getCurrentSeason } from "@/types/season";
import { isBettable } from "@/types/bet";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/hud — les quelques chiffres de la barre du haut et de la barre d'onglets (mobile) :
 * points et rang de la saison, paris encore ouverts de la nuit en cours.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const [tonight, ranking] = await Promise.all([
      loadBetGames(prisma, [getCurrentNightDate()], userId),
      getSeasonRanking(prisma, getCurrentSeason()),
    ]);
    const now = Date.now();
    const open = tonight.filter((g) => isBettable(g, now));
    const missing = open.filter((g) => !g.prediction);
    const me = ranking.find((r) => r.userId === userId) ?? null;

    return NextResponse.json({
      points:       me?.points ?? 0,
      rank:         me?.rank ?? null,
      totalPlayers: ranking.length,
      missing:      missing.length,
      open:         open.length,
      nextDeadline: (missing[0] ?? open[0])?.predictionDeadline ?? null,
    });
  } catch (error) {
    console.error("[API me/hud]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
