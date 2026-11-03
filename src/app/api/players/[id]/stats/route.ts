import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isPlayed(minutes: string | null): boolean {
  return minutes !== null && minutes !== "0:00";
}

function calculateDoubles(stats: {
  points: number;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
}): { isDoubleDouble: boolean; isTripleDouble: boolean } {
  const cats = [
    stats.points,
    stats.rebounds ?? 0,
    stats.assists ?? 0,
    stats.steals ?? 0,
    stats.blocks ?? 0,
  ];
  const n = cats.filter((v) => v >= 10).length;
  return { isDoubleDouble: n >= 2, isTripleDouble: n >= 3 };
}

type SeasonTypeKey = "Regular Season" | "Play-In Tournament" | "Playoffs";

const SEASON_TYPE_LABELS: Record<SeasonTypeKey, string> = {
  "Regular Season":     "Saison régulière",
  "Play-In Tournament": "Play-In",
  "Playoffs":           "Playoffs",
};

// ─── Types de la réponse ──────────────────────────────────────

export interface GameLine {
  gameId:         string;
  gameDate:       string;
  opponent:       string;
  points:         number;
  rebounds:       number | null;
  assists:        number | null;
  steals:         number | null;
  blocks:         number | null;
  minutes:        string | null;
  fieldGoals:     string;
  threePointers:  string;
  freeThrows:     string;
  plusMinus:      number | null;
  isDoubleDouble: boolean;
  isTripleDouble: boolean;
}

export interface SeasonTypeStats {
  label:       string;
  gamesPlayed: number;
  averages: {
    ppg: string;
    rpg: string;
    apg: string;
    spg: string;
    bpg: string;
    tpg: string;
    fgPct:  string;
    fg3Pct: string;
    ftPct:  string;
    mpg:    string;
  };
  totals: {
    points:       number;
    rebounds:     number;
    assists:      number;
    steals:       number;
    blocks:       number;
    doubleDoubles: number;
    tripleDoubles: number;
  };
  lastGames: GameLine[];
}

export interface PlayerStatsResponse {
  player:         { id: string; fullName: string };
  season:         string;
  availableTypes: SeasonTypeKey[];
  byType:         Partial<Record<SeasonTypeKey, SeasonTypeStats>>;
}

// ─── Calcul pour un sous-ensemble de matchs ──────────────────

function computeStats(
  rows: Array<{
    game:                { id: string; gameDate: Date; homeTeamId: string; awayTeamId: string; homeTeam: { abbreviation: string }; awayTeam: { abbreviation: string } };
    team:                { id: string };
    minutes:             string | null;
    points:              number;
    rebounds:            number | null;
    assists:             number | null;
    steals:              number | null;
    blocks:              number | null;
    turnovers:           number | null;
    fieldGoalsMade:      number | null;
    fieldGoalsAttempted: number | null;
    threePointersMade:   number | null;
    threePointersAttempted: number | null;
    freeThrowsMade:      number | null;
    freeThrowsAttempted: number | null;
    plusMinus:           number | null;
  }>,
  label: string
): SeasonTypeStats {
  const gp = rows.length;

  let pts = 0, reb = 0, ast = 0, stl = 0, blk = 0, tov = 0;
  let fgm = 0, fga = 0, fg3m = 0, fg3a = 0, ftm = 0, fta = 0;
  let minTotal = 0;
  let dd = 0, td = 0;

  const parseMin = (s: string | null): number => {
    if (!s) return 0;
    const [m, sec] = s.split(":").map(Number);
    return (m || 0) + (sec || 0) / 60;
  };

  for (const r of rows) {
    pts += r.points;
    reb += r.rebounds ?? 0;
    ast += r.assists  ?? 0;
    stl += r.steals   ?? 0;
    blk += r.blocks   ?? 0;
    tov += r.turnovers ?? 0;
    fgm += r.fieldGoalsMade ?? 0;
    fga += r.fieldGoalsAttempted ?? 0;
    fg3m += r.threePointersMade ?? 0;
    fg3a += r.threePointersAttempted ?? 0;
    ftm += r.freeThrowsMade ?? 0;
    fta += r.freeThrowsAttempted ?? 0;
    minTotal += parseMin(r.minutes);

    const { isDoubleDouble, isTripleDouble } = calculateDoubles(r);
    if (isTripleDouble) td++;
    else if (isDoubleDouble) dd++;
  }

  const pct = (made: number, att: number) =>
    att > 0 ? ((made / att) * 100).toFixed(1) : "0.0";

  const lastGames: GameLine[] = rows.slice(0, 10).map((r) => {
    const isHome = r.team.id === r.game.homeTeamId;
    const opponent = isHome
      ? r.game.awayTeam.abbreviation
      : r.game.homeTeam.abbreviation;
    const { isDoubleDouble, isTripleDouble } = calculateDoubles(r);
    return {
      gameId:         r.game.id,
      gameDate:       r.game.gameDate.toISOString(),
      opponent,
      points:         r.points,
      rebounds:       r.rebounds,
      assists:        r.assists,
      steals:         r.steals,
      blocks:         r.blocks,
      minutes:        r.minutes,
      fieldGoals:     `${r.fieldGoalsMade ?? 0}/${r.fieldGoalsAttempted ?? 0}`,
      threePointers:  `${r.threePointersMade ?? 0}/${r.threePointersAttempted ?? 0}`,
      freeThrows:     `${r.freeThrowsMade ?? 0}/${r.freeThrowsAttempted ?? 0}`,
      plusMinus:      r.plusMinus,
      isDoubleDouble,
      isTripleDouble,
    };
  });

  return {
    label,
    gamesPlayed: gp,
    averages: {
      ppg:   (pts  / gp).toFixed(1),
      rpg:   (reb  / gp).toFixed(1),
      apg:   (ast  / gp).toFixed(1),
      spg:   (stl  / gp).toFixed(1),
      bpg:   (blk  / gp).toFixed(1),
      tpg:   (tov  / gp).toFixed(1),
      mpg:   (minTotal / gp).toFixed(1),
      fgPct:  pct(fgm,  fga),
      fg3Pct: pct(fg3m, fg3a),
      ftPct:  pct(ftm,  fta),
    },
    totals: {
      points: pts, rebounds: reb, assists: ast,
      steals: stl, blocks: blk,
      doubleDoubles: dd, tripleDoubles: td,
    },
    lastGames,
  };
}

// ─── Route ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const player = await prisma.player.findUnique({
      where:  { id },
      select: { id: true, fullName: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }

    const season = getCurrentSeason();

    // Une seule requête — tous les matchs de la saison
    const allRows = await prisma.gamePlayerStats.findMany({
      where: {
        playerId: id,
        game: { season, status: "FINAL" },
      },
      include: {
        game: {
          select: {
            id: true, gameDate: true, seasonType: true,
            homeTeamId: true, awayTeamId: true,
            homeTeam: { select: { abbreviation: true } },
            awayTeam: { select: { abbreviation: true } },
          },
        },
        team: { select: { id: true } },
      },
      orderBy: { game: { gameDate: "desc" } },
    });

    // Exclure les DNP
    const played = allRows.filter((r) => isPlayed(r.minutes));

    // Grouper par seasonType
    const groups: Partial<Record<SeasonTypeKey, typeof played>> = {};
    for (const r of played) {
      const t = r.game.seasonType as SeasonTypeKey;
      if (!groups[t]) groups[t] = [];
      groups[t]!.push(r);
    }

    const ORDER: SeasonTypeKey[] = ["Regular Season", "Play-In Tournament", "Playoffs"];
    const availableTypes = ORDER.filter((t) => (groups[t]?.length ?? 0) > 0);

    const byType: Partial<Record<SeasonTypeKey, SeasonTypeStats>> = {};
    for (const t of availableTypes) {
      byType[t] = computeStats(groups[t]!, SEASON_TYPE_LABELS[t]);
    }

    const response: PlayerStatsResponse = {
      player,
      season,
      availableTypes,
      byType,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[player stats]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
