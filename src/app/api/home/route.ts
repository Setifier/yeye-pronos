import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadBetGames, findPreviousNightWithGames, findNextNightWithGames } from "@/lib/bet-games";
import { getSeasonRanking } from "@/lib/season-ranking";
import { getCurrentNightDate } from "@/lib/game-night";
import { getCurrentSeason } from "@/types/season";
import { getPreseasonDeadline } from "@/lib/special-bets";
import { PRESEASON_BET_TYPES } from "@/types/special-predictions";

export const dynamic = "force-dynamic";

/**
 * GET /api/home — données de l'accueil connecté, en un appel.
 *
 * tonight   : matchs de la nuit NBA en cours (date US Eastern de maintenant) + pronos
 * lastNight : dernière nuit jouée avant ce soir (résultats + points)
 * nextNight : prochaine nuit avec des matchs, si aucun match ce soir
 * me        : points, rang et bilan de la saison en cours
 *
 * Les "paris manquants" ne concernent QUE la nuit en cours (calculés côté client
 * avec isBettable/missingBets pour suivre l'heure exacte).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const season = getCurrentSeason();
    const tonightDate = getCurrentNightDate();

    const [tonight, lastNightDate, ranking] = await Promise.all([
      loadBetGames(prisma, [tonightDate], userId),
      findPreviousNightWithGames(prisma, tonightDate),
      getSeasonRanking(prisma, season),
    ]);

    const [lastNight, nextNightDate] = await Promise.all([
      lastNightDate ? loadBetGames(prisma, [lastNightDate], userId) : Promise.resolve([]),
      tonight.length === 0 ? findNextNightWithGames(prisma, tonightDate) : Promise.resolve(null),
    ]);

    let nextNight: { date: string; games: number; firstGameAt: string | null } | null = null;
    if (nextNightDate) {
      const games = await loadBetGames(prisma, [nextNightDate], userId);
      nextNight = { date: nextNightDate, games: games.length, firstGameAt: games[0]?.gameDate ?? null };
    }

    const meEntry = ranking.find((r) => r.userId === userId) ?? null;

    // Paris de début de saison : rappel tant qu'ils sont ouverts
    const [preseasonDeadline, preseasonDone] = await Promise.all([
      getPreseasonDeadline(prisma, season),
      prisma.specialPrediction.count({ where: { userId, season, type: { in: [...PRESEASON_BET_TYPES] } } }),
    ]);

    return NextResponse.json({
      season,
      serverTime: new Date().toISOString(),
      preseason: {
        deadline: preseasonDeadline.toISOString(),
        open: Date.now() < preseasonDeadline.getTime(),
        done: preseasonDone,
        total: PRESEASON_BET_TYPES.length,
      },
      tonight:   { date: tonightDate, games: tonight },
      lastNight: lastNightDate ? { date: lastNightDate, games: lastNight } : null,
      nextNight,
      me: {
        rank:         meEntry?.rank ?? null,
        totalPlayers: ranking.length,
        points:       meEntry?.points ?? 0,
        matchPoints:  meEntry?.matchPoints ?? 0,
        specialPoints: meEntry?.specialPoints ?? 0,
        won:          meEntry?.won ?? 0,
        lost:         meEntry?.lost ?? 0,
        pending:      meEntry?.pending ?? 0,
        winRate:      meEntry?.winRate ?? 0,
      },
      top: ranking.slice(0, 5).map((r) => ({ rank: r.rank, userId: r.userId, name: r.name, image: r.image, points: r.points })),
    });
  } catch (error) {
    console.error("[API home]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
