/**
 * GET /api/playoffs/joueurs?stat=points&season=2025-26&page=1&order=desc
 *
 * Leaders joueurs en playoffs — agrégé à la volée depuis GamePlayerStats
 * (PlayerSeasonStats ne contient que la saison régulière)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

const PAGE_SIZE = 50;

export type PlayoffStatKey =
  | "points" | "rebounds" | "offensive_rebounds" | "defensive_rebounds"
  | "assists" | "steals" | "blocks" | "turnovers" | "personal_fouls"
  | "fg_pct" | "three_pct" | "ft_pct"
  | "fg_made" | "fg_attempted" | "three_made" | "three_attempted"
  | "ft_made" | "ft_attempted" | "plus_minus" | "minutes"
  | "double_doubles" | "triple_doubles" | "games_played";

export interface PlayoffLeaderPlayer {
  rank:         number;
  playerId:     string;
  fullName:     string;
  firstName:    string;
  lastName:     string;
  position:     string | null;
  headshot:     string | null;
  teamId:       string | null;
  teamAbbr:     string | null;
  teamCity:     string | null;
  teamName:     string | null;
  teamColor:    string | null;
  statValue:    number | null;
  gamesPlayed:  number;
  // Averages
  pointsPerGame:            number;
  reboundsPerGame:          number;
  assistsPerGame:           number;
  stealsPerGame:            number;
  blocksPerGame:            number;
  turnoversPerGame:         number;
  minutesPerGame:           number;
  offensiveReboundsPerGame: number;
  defensiveReboundsPerGame: number;
  fgmPerGame:               number;
  fgaPerGame:               number;
  threePmPerGame:           number;
  threePaPerGame:           number;
  ftmPerGame:               number;
  ftaPerGame:               number;
  foulsPerGame:             number;
  plusMinus:                number;
  fieldGoalPct:             number;
  threePointPct:            number;
  freeThrowPct:             number;
  doubleDoubles:            number;
  tripleDoubles:            number;
}

export interface PlayoffLeadersResponse {
  season:     string;
  stat:       string;
  order:      "asc" | "desc";
  page:       number;
  totalCount: number;
  totalPages: number;
  leaders:    PlayoffLeaderPlayer[];
}

function parseMin(s: string | null): number {
  if (!s || s === "0:00") return 0;
  const [m, sec] = s.split(":").map(Number);
  return (m || 0) + (sec || 0) / 60;
}

function isPlayed(minutes: string | null): boolean {
  return minutes !== null && minutes !== "0:00";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const season  = searchParams.get("season") ?? getCurrentSeason();
    const statKey = (searchParams.get("stat") ?? "points") as PlayoffStatKey;
    const order   = (searchParams.get("order") ?? "desc") as "asc" | "desc";
    const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    // Tous les records playoffs
    const allStats = await prisma.gamePlayerStats.findMany({
      where: {
        game: { season, status: "FINAL", seasonType: "Playoffs" },
      },
      include: {
        player: {
          select: {
            id: true, firstName: true, lastName: true, fullName: true,
            position: true, headshot: true,
            team: {
              select: {
                id: true, abbreviation: true, city: true, name: true, primaryColor: true,
              },
            },
          },
        },
      },
    });

    // Agréger par joueur
    type PlayerAgg = {
      player: typeof allStats[0]["player"];
      gp: number; minFlt: number;
      pts: number; reb: number; ast: number; stl: number; blk: number;
      tov: number; pf: number; pm: number;
      fgm: number; fga: number; fg3m: number; fg3a: number; ftm: number; fta: number;
      oreb: number; dreb: number; dd: number; td: number;
    };

    const byPlayer = new Map<string, PlayerAgg>();

    for (const r of allStats) {
      if (!isPlayed(r.minutes)) continue;

      const pid = r.playerId;
      const agg = byPlayer.get(pid) ?? {
        player: r.player,
        gp: 0, minFlt: 0,
        pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
        tov: 0, pf: 0, pm: 0,
        fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
        oreb: 0, dreb: 0, dd: 0, td: 0,
      };

      agg.gp++;
      agg.minFlt += parseMin(r.minutes);
      agg.pts  += r.points;
      agg.reb  += r.rebounds  ?? 0;
      agg.ast  += r.assists   ?? 0;
      agg.stl  += r.steals    ?? 0;
      agg.blk  += r.blocks    ?? 0;
      agg.tov  += r.turnovers ?? 0;
      agg.pf   += r.personalFouls ?? 0;
      agg.pm   += r.plusMinus ?? 0;
      agg.fgm  += r.fieldGoalsMade ?? 0;
      agg.fga  += r.fieldGoalsAttempted ?? 0;
      agg.fg3m += r.threePointersMade ?? 0;
      agg.fg3a += r.threePointersAttempted ?? 0;
      agg.ftm  += r.freeThrowsMade ?? 0;
      agg.fta  += r.freeThrowsAttempted ?? 0;
      agg.oreb += r.offensiveRebounds ?? 0;
      agg.dreb += r.defensiveRebounds ?? 0;

      // DD/TD
      const cats = [r.points, r.rebounds ?? 0, r.assists ?? 0, r.steals ?? 0, r.blocks ?? 0];
      const n = cats.filter((v) => v >= 10).length;
      if (n >= 3) agg.td++;
      else if (n >= 2) agg.dd++;

      byPlayer.set(pid, agg);
    }

    // Convertir en tableau avec moyennes
    const pct = (m: number, a: number) => (a > 0 ? m / a : 0);

    const rows = [...byPlayer.values()].map((a) => {
      const gp = a.gp;
      return {
        playerId:  a.player.id,
        fullName:  a.player.fullName,
        firstName: a.player.firstName,
        lastName:  a.player.lastName,
        position:  a.player.position,
        headshot:  a.player.headshot,
        teamId:    a.player.team?.id    ?? null,
        teamAbbr:  a.player.team?.abbreviation ?? null,
        teamCity:  a.player.team?.city  ?? null,
        teamName:  a.player.team?.name  ?? null,
        teamColor: a.player.team?.primaryColor ?? null,
        gamesPlayed:              gp,
        pointsPerGame:            a.pts  / gp,
        reboundsPerGame:          a.reb  / gp,
        assistsPerGame:           a.ast  / gp,
        stealsPerGame:            a.stl  / gp,
        blocksPerGame:            a.blk  / gp,
        turnoversPerGame:         a.tov  / gp,
        minutesPerGame:           a.minFlt / gp,
        offensiveReboundsPerGame: a.oreb / gp,
        defensiveReboundsPerGame: a.dreb / gp,
        fgmPerGame:               a.fgm  / gp,
        fgaPerGame:               a.fga  / gp,
        threePmPerGame:           a.fg3m / gp,
        threePaPerGame:           a.fg3a / gp,
        ftmPerGame:               a.ftm  / gp,
        ftaPerGame:               a.fta  / gp,
        foulsPerGame:             a.pf   / gp,
        plusMinus:                a.pm,
        fieldGoalPct:             pct(a.fgm,  a.fga),
        threePointPct:            pct(a.fg3m, a.fg3a),
        freeThrowPct:             pct(a.ftm,  a.fta),
        doubleDoubles:            a.dd,
        tripleDoubles:            a.td,
      };
    });

    // Fonction de tri selon la stat demandée
    const getVal = (r: typeof rows[0]): number => {
      switch (statKey) {
        case "points":              return r.pointsPerGame;
        case "rebounds":            return r.reboundsPerGame;
        case "offensive_rebounds":  return r.offensiveReboundsPerGame;
        case "defensive_rebounds":  return r.defensiveReboundsPerGame;
        case "assists":             return r.assistsPerGame;
        case "steals":              return r.stealsPerGame;
        case "blocks":              return r.blocksPerGame;
        case "turnovers":           return r.turnoversPerGame;
        case "personal_fouls":      return r.foulsPerGame;
        case "fg_pct":              return r.fieldGoalPct;
        case "three_pct":           return r.threePointPct;
        case "ft_pct":              return r.freeThrowPct;
        case "fg_made":             return r.fgmPerGame;
        case "fg_attempted":        return r.fgaPerGame;
        case "three_made":          return r.threePmPerGame;
        case "three_attempted":     return r.threePaPerGame;
        case "ft_made":             return r.ftmPerGame;
        case "ft_attempted":        return r.ftaPerGame;
        case "plus_minus":          return r.plusMinus;
        case "minutes":             return r.minutesPerGame;
        case "double_doubles":      return r.doubleDoubles;
        case "triple_doubles":      return r.tripleDoubles;
        case "games_played":        return r.gamesPlayed;
        default:                    return r.pointsPerGame;
      }
    };

    // Filtre minimum tentatives pour les %
    const filtered = rows.filter((r) => {
      if (statKey === "fg_pct")    return r.fgaPerGame  >= 3;
      if (statKey === "three_pct") return r.threePaPerGame >= 1.5;
      if (statKey === "ft_pct")    return r.ftaPerGame  >= 1;
      return true;
    });

    filtered.sort((a, b) =>
      order === "desc" ? getVal(b) - getVal(a) : getVal(a) - getVal(b)
    );

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const offset     = (page - 1) * PAGE_SIZE;
    const pageRows   = filtered.slice(offset, offset + PAGE_SIZE);

    const leaders: PlayoffLeaderPlayer[] = pageRows.map((r, i) => ({
      rank:      order === "desc" ? offset + i + 1 : totalCount - offset - i,
      statValue: getVal(r),
      ...r,
    }));

    return NextResponse.json({
      season, stat: statKey, order, page,
      totalCount, totalPages, leaders,
    } satisfies PlayoffLeadersResponse);

  } catch (err) {
    console.error("[playoffs/joueurs]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
