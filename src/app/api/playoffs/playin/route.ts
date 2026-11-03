import { NextRequest, NextResponse } from "next/server";
import { prisma }            from "@/lib/prisma";
import { getCurrentSeason }  from "@/types/season";

/**
 * GET /api/playoffs/playin?season=2025-26
 *
 * Returns Play-In Tournament games for the season, organised by conference into:
 *   game78      — #7 vs #8 : winner = 7th seed
 *   game910     — #9 vs #10 : winner advances
 *   gameDeciding — L(7v8) vs W(9v10) : winner = 8th seed
 *
 * seedMap: { [teamId]: seed }  where seed ∈ {7,8,9,10}
 * Seeds are inferred from regular-season win% (highest win% = seed 7).
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

const TEAM_SELECT = {
  id:           true,
  name:         true,
  city:         true,
  abbreviation: true,
  conference:   true,
  logoUrl:      true,
  primaryColor: true,
} as const;

type RawGame = Awaited<ReturnType<typeof fetchGames>>[number];

async function fetchGames(season: string) {
  return prisma.game.findMany({
    where:   { season, seasonType: "Play-In Tournament" },
    select: {
      id:         true,
      gameDate:   true,
      status:     true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore:  true,
      awayScore:  true,
      winnerId:   true,
      homeTeam:   { select: TEAM_SELECT },
      awayTeam:   { select: TEAM_SELECT },
    },
    orderBy: { gameDate: "asc" },
  });
}

function organiseConference(
  games:   RawGame[],
  seedMap: Record<string, number>
) {
  if (games.length === 0) return null;

  const teamIds = [...new Set(games.flatMap((g) => [g.homeTeamId, g.awayTeamId]))];
  // Sort by seed ascending: seed 7 first, 10 last
  const sorted = teamIds.sort((a, b) => (seedMap[a] ?? 99) - (seedMap[b] ?? 99));
  const top2 = sorted.slice(0, 2); // seeds 7 & 8
  const bot2 = sorted.slice(2, 4); // seeds 9 & 10

  const is78 = (g: RawGame) =>
    top2.includes(g.homeTeamId) && top2.includes(g.awayTeamId);
  const is910 = (g: RawGame) =>
    bot2.includes(g.homeTeamId) && bot2.includes(g.awayTeamId);

  return {
    game78:       games.find(is78)                         ?? null,
    game910:      games.find(is910)                        ?? null,
    gameDeciding: games.find((g) => !is78(g) && !is910(g)) ?? null,
  };
}

// ─── handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const season = request.nextUrl.searchParams.get("season") ?? getCurrentSeason();

    const games = await fetchGames(season);

    if (games.length === 0) {
      return NextResponse.json({ season, seedMap: {}, west: null, east: null });
    }

    // Fetch regular-season standings to rank the 8 play-in teams (4 per conf)
    const teamIds = [...new Set(games.flatMap((g) => [g.homeTeamId, g.awayTeamId]))];
    const stats   = await prisma.teamSeasonStats.findMany({
      where:  { season, teamId: { in: teamIds } },
      select: { teamId: true, winPct: true, wins: true },
    });
    const statsMap = new Map(stats.map((s) => [s.teamId, s]));

    // Build seedMap: within each conference rank the 4 teams 7→10 by win%
    const seedMap: Record<string, number> = {};
    for (const conf of ["WEST", "EAST"] as const) {
      const confIds = teamIds.filter((id) => {
        const g = games.find((g) => g.homeTeamId === id || g.awayTeamId === id);
        const t = g?.homeTeamId === id ? g.homeTeam : g?.awayTeam;
        return (t?.conference as string) === conf;
      });
      const sorted = [...confIds].sort((a, b) => {
        const aS = statsMap.get(a);
        const bS = statsMap.get(b);
        return (bS?.winPct ?? 0) - (aS?.winPct ?? 0) || (bS?.wins ?? 0) - (aS?.wins ?? 0);
      });
      sorted.forEach((id, i) => { seedMap[id] = 7 + i; });
    }

    const byConf = (conf: "WEST" | "EAST") =>
      games.filter((g) => (g.homeTeam.conference as string) === conf);

    return NextResponse.json({
      season,
      seedMap,
      west: organiseConference(byConf("WEST"), seedMap),
      east: organiseConference(byConf("EAST"), seedMap),
    });
  } catch (err) {
    console.error("[API] /playoffs/playin error:", err);
    return NextResponse.json({ error: "Failed to fetch play-in data" }, { status: 500 });
  }
}
