import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { getCurrentSeason, getPreviousSeason } from "@/types/season";
import { PRESEASON_BET_TYPES } from "@/types/special-predictions";
import {
  getPreseasonDeadline,
  loadSeasonTeams,
  getNbaCupOdds,
  defaultStandings,
  isPreseasonType,
  validatePreseasonData,
  MVP_POINTS,
} from "@/lib/special-bets";

export const dynamic = "force-dynamic";

/**
 * GET /api/special-predictions[?include=players]
 *   Paris de début de saison de l'utilisateur (saison en cours), date limite, équipes,
 *   cotes NBA Cup, classement par défaut. `include=players` ajoute les candidats MVP.
 *
 * PUT /api/special-predictions  { type, data }
 *   Enregistre un pari de début de saison (refusé après la date limite).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Connecte-toi pour parier" }, { status: 401 });

  try {
    const season = getCurrentSeason();
    const [deadline, teams, saved] = await Promise.all([
      getPreseasonDeadline(prisma, season),
      loadSeasonTeams(prisma, season),
      prisma.specialPrediction.findMany({
        where: { userId: session.user.id, season, type: { in: [...PRESEASON_BET_TYPES] } },
        select: { type: true, data: true, status: true, pointsEarned: true, updatedAt: true },
      }),
    ]);
    const odds = await getNbaCupOdds(prisma, season, teams);

    let players: unknown[] | undefined;
    if (request.nextUrl.searchParams.get("include") === "players") {
      const previous = getPreviousSeason(season);
      const rows = await prisma.player.findMany({
        where: { teamId: { not: null } },
        select: {
          id: true, fullName: true, headshot: true, position: true, teamId: true,
          seasonStats: { where: { season: { in: [season, previous] } }, select: { season: true, pointsPerGame: true, gamesPlayed: true } },
        },
      });
      players = rows
        .map((p) => {
          const cur = p.seasonStats.find((s) => s.season === season);
          const prev = p.seasonStats.find((s) => s.season === previous);
          return {
            id: p.id, fullName: p.fullName, headshot: p.headshot, position: p.position, teamId: p.teamId,
            ppg: cur?.pointsPerGame ?? null, games: cur?.gamesPlayed ?? 0,
            previousPpg: prev?.pointsPerGame ?? null,
          };
        })
        .sort((a, b) => (b.previousPpg ?? b.ppg ?? 0) - (a.previousPpg ?? a.ppg ?? 0));
    }

    return NextResponse.json({
      season,
      previousSeason: getPreviousSeason(season),
      deadline: deadline.toISOString(),
      open: Date.now() < deadline.getTime(),
      serverTime: new Date().toISOString(),
      teams: teams.map((t) => ({ ...t, nbaCupPoints: odds.get(t.id) ?? null })),
      mvpPoints: MVP_POINTS,
      defaults: { standings: defaultStandings(teams) },
      predictions: Object.fromEntries(
        PRESEASON_BET_TYPES.map((type) => {
          const p = saved.find((s) => s.type === type);
          return [type, p ? { data: p.data, status: p.status, pointsEarned: p.pointsEarned, updatedAt: p.updatedAt } : null];
        })
      ),
      ...(players ? { players } : {}),
    });
  } catch (error) {
    console.error("[API special-predictions GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Connecte-toi pour parier" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body?.type ?? "");
    if (!isPreseasonType(type)) return NextResponse.json({ error: "Type de pari inconnu" }, { status: 400 });

    const season = getCurrentSeason();
    const deadline = await getPreseasonDeadline(prisma, season);
    if (Date.now() >= deadline.getTime()) {
      return NextResponse.json({ error: "Les paris de début de saison sont fermés" }, { status: 400 });
    }

    const teams = await loadSeasonTeams(prisma, season);
    const result = await validatePreseasonData(prisma, type, body?.data, teams);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    const saved = await prisma.specialPrediction.upsert({
      where:  { userId_type_season: { userId: session.user.id, type, season } },
      create: { userId: session.user.id, type, season, data: result.data as Prisma.InputJsonValue, status: "OPEN" },
      update: { data: result.data as Prisma.InputJsonValue, status: "OPEN" },
      select: { type: true, data: true, status: true, pointsEarned: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, prediction: saved });
  } catch (error) {
    console.error("[API special-predictions PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
