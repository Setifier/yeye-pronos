/**
 * GET /api/leaders?stat=points&season=2025-26&page=1&minGames=20
 *
 * Returns player stat leaders, paginated 50 by 50.
 *
 * Available stats:
 *   points | rebounds | assists | steals | blocks |
 *   fg_pct | three_pct | ft_pct | plus_minus |
 *   double_doubles | triple_doubles | minutes | turnovers
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

// ─── Stat → DB field mapping ──────────────────────────────────────────────────

const STAT_FIELDS = {
  points:              "pointsPerGame",
  rebounds:            "reboundsPerGame",
  offensive_rebounds:  "offensiveReboundsPerGame",
  defensive_rebounds:  "defensiveReboundsPerGame",
  assists:             "assistsPerGame",
  steals:              "stealsPerGame",
  blocks:              "blocksPerGame",
  fg_pct:              "fieldGoalPct",
  three_pct:           "threePointPct",
  ft_pct:              "freeThrowPct",
  fg_made:             "fgmPerGame",
  fg_attempted:        "fgaPerGame",
  three_made:          "threePmPerGame",
  three_attempted:     "threePaPerGame",
  ft_made:             "ftmPerGame",
  ft_attempted:        "ftaPerGame",
  personal_fouls:      "foulsPerGame",
  double_doubles:      "doubleDoubles",
  triple_doubles:      "tripleDoubles",
  plus_minus:          "plusMinus",
  minutes:             "minutesPerGame",
  turnovers:           "turnoversPerGame",
  games_played:        "gamesPlayed",
} as const;

type StatKey = keyof typeof STAT_FIELDS;

// Nullable fields — exclude nulls when sorting on them
const NULLABLE_FIELDS = new Set([
  "stealsPerGame",
  "blocksPerGame",
  "fieldGoalPct",
  "threePointPct",
  "freeThrowPct",
  "plusMinus",
  "minutesPerGame",
  "turnoversPerGame",
  "offensiveReboundsPerGame",
  "defensiveReboundsPerGame",
  "fgmPerGame",
  "fgaPerGame",
  "threePmPerGame",
  "threePaPerGame",
  "ftmPerGame",
  "ftaPerGame",
  "foulsPerGame",
]);

const PAGE_SIZE = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaderPlayer {
  rank:        number;
  playerId:    string;
  fullName:    string;
  firstName:   string;
  lastName:    string;
  position:    string | null;
  headshot:    string | null;
  teamId:      string | null;
  teamAbbr:    string | null;
  teamCity:    string | null;
  teamName:    string | null;
  teamColor:   string | null;
  gamesPlayed: number;
  statValue:   number | null;
  // Per-game averages
  pointsPerGame:   number;
  reboundsPerGame: number;
  assistsPerGame:  number;
  stealsPerGame:   number | null;
  blocksPerGame:   number | null;
  turnoversPerGame: number | null;
  minutesPerGame:  number | null;
  fieldGoalPct:    number | null;
  threePointPct:   number | null;
  freeThrowPct:    number | null;
  plusMinus:       number | null;
  doubleDoubles:   number;
  tripleDoubles:   number;
  // Shooting totals (for per-game calculations)
  totalFGM:  number | null;
  totalFGA:  number | null;
  total3PM:  number | null;
  total3PA:  number | null;
  totalFTM:  number | null;
  totalFTA:  number | null;
  // Rebounds split
  offensiveReboundsPerGame: number | null;
  defensiveReboundsPerGame: number | null;
  // Shooting per game (for leaders sorting)
  fgmPerGame:    number | null;
  fgaPerGame:    number | null;
  threePmPerGame: number | null;
  threePaPerGame: number | null;
  // LF et fautes per game
  ftmPerGame:    number | null;
  ftaPerGame:    number | null;
  foulsPerGame:  number | null;
}

export interface LeadersResponse {
  season:    string;
  stat:      string;
  order:     "asc" | "desc";
  page:      number;
  minGames:  number;
  totalCount: number;
  totalPages: number;
  leaders:   LeaderPlayer[];
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const season   = searchParams.get("season")   ?? getCurrentSeason();
    const statKey  = (searchParams.get("stat")    ?? "points") as StatKey;
    const order    = (searchParams.get("order")   ?? "desc") as "asc" | "desc";
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    // Minimums dynamiques selon l'avancement de la saison
    const progressData = await prisma.playerSeasonStats.aggregate({
      where: { season },
      _max: { gamesPlayed: true },
    });
    const maxGamesPlayed = progressData._max.gamesPlayed ?? 82;
    // minGames : 60 % des matchs joués (min 1, max 49 pour une saison complète de 82 matchs)
    const defaultMinGames = Math.max(1, Math.floor(maxGamesPlayed * 0.6));
    const minGames = parseInt(searchParams.get("minGames") ?? String(defaultMinGames), 10);
    // Minimum LF tentés : 1.5 tentatives/match × matchs joués (min 10)
    const minFTA = Math.max(10, Math.floor(maxGamesPlayed * 1.5));

    const field = STAT_FIELDS[statKey] ?? "pointsPerGame";
    const nullFilter = NULLABLE_FIELDS.has(field) ? { [field]: { not: null } } : {};

    // Minimums de tentatives pour les stats de pourcentage (seuils NBA officiels, dynamiques)
    const attemptFilter: Record<string, unknown> =
      statKey === "fg_pct"     ? { fgaPerGame:    { gte: 3      } } :
      statKey === "three_pct"  ? { threePaPerGame: { gte: 1.5   } } :
      statKey === "ft_pct"     ? { totalFTA:       { gte: minFTA } } :
      {};

    const where = {
      season,
      gamesPlayed: { gte: minGames },
      ...nullFilter,
      ...attemptFilter,
    };

    // Count total for pagination
    const totalCount = await prisma.playerSeasonStats.count({ where });
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const records = await prisma.playerSeasonStats.findMany({
      where,
      include: {
        player: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            fullName:  true,
            position:  true,
            headshot:  true,
            team: {
              select: {
                id:           true,
                abbreviation: true,
                city:         true,
                name:         true,
                primaryColor: true,
              },
            },
          },
        },
      },
      orderBy: { [field]: order },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    });

    const offset = (page - 1) * PAGE_SIZE;
    const leaders: LeaderPlayer[] = records.map((r, i) => ({
      rank:     order === "desc" ? offset + i + 1 : totalCount - offset - i,
      playerId: r.playerId,
      fullName:  r.player.fullName,
      firstName: r.player.firstName,
      lastName:  r.player.lastName,
      position:  r.player.position,
      headshot:  r.player.headshot,
      teamId:    r.player.team?.id    ?? null,
      teamAbbr:  r.player.team?.abbreviation ?? null,
      teamCity:  r.player.team?.city   ?? null,
      teamName:  r.player.team?.name   ?? null,
      teamColor: r.player.team?.primaryColor ?? null,
      gamesPlayed:     r.gamesPlayed,
      statValue:       (r as Record<string, unknown>)[field] as number | null,
      pointsPerGame:   r.pointsPerGame,
      reboundsPerGame: r.reboundsPerGame,
      assistsPerGame:  r.assistsPerGame,
      stealsPerGame:   r.stealsPerGame    ?? null,
      blocksPerGame:   r.blocksPerGame    ?? null,
      turnoversPerGame: r.turnoversPerGame ?? null,
      minutesPerGame:  r.minutesPerGame   ?? null,
      fieldGoalPct:    r.fieldGoalPct     ?? null,
      threePointPct:   r.threePointPct    ?? null,
      freeThrowPct:    r.freeThrowPct     ?? null,
      plusMinus:       r.plusMinus        ?? null,
      doubleDoubles:   r.doubleDoubles,
      tripleDoubles:   r.tripleDoubles,
      totalFGM: r.totalFGM ?? null,
      totalFGA: r.totalFGA ?? null,
      total3PM: r.total3PM ?? null,
      total3PA: r.total3PA ?? null,
      totalFTM: r.totalFTM ?? null,
      totalFTA: r.totalFTA ?? null,
      offensiveReboundsPerGame: r.offensiveReboundsPerGame ?? null,
      defensiveReboundsPerGame: r.defensiveReboundsPerGame ?? null,
      fgmPerGame:    r.fgmPerGame    ?? null,
      fgaPerGame:    r.fgaPerGame    ?? null,
      threePmPerGame: r.threePmPerGame ?? null,
      threePaPerGame: r.threePaPerGame ?? null,
      ftmPerGame:    r.ftmPerGame    ?? null,
      ftaPerGame:    r.ftaPerGame    ?? null,
      foulsPerGame:  r.foulsPerGame  ?? null,
    }));

    const response: LeadersResponse = {
      season,
      stat: statKey,
      order,
      page,
      minGames,
      totalCount,
      totalPages,
      leaders,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[leaders]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
