import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

export interface PlayoffTeamStats {
  teamId:       string;
  abbreviation: string;
  city:         string;
  name:         string;
  primaryColor: string | null;
  conference:   string;
  wins:         number;
  losses:       number;
  games:        number;
  ppg:          number;   // points marqués / match
  oppg:         number;   // points encaissés / match
  netRating:    number;   // ppg - oppg
  fgPct:        number;
  fg3Pct:       number;
  ftPct:        number;
  rebPg:        number;
  astPg:        number;
  tovPg:        number;
  stlPg:        number;
  blkPg:        number;
}

export interface PlayoffTeamsResponse {
  season:    string;
  teams:     PlayoffTeamStats[];
}

export async function GET() {
  try {
    const season = getCurrentSeason();

    // Toutes les équipes présentes en playoffs
    const teams = await prisma.team.findMany({
      select: {
        id: true, abbreviation: true, city: true, name: true,
        primaryColor: true, conference: true,
      },
    });

    // Matchs playoffs terminés
    const games = await prisma.game.findMany({
      where: { season, status: "FINAL", seasonType: "Playoffs" },
      select: {
        id: true,
        homeTeamId: true, awayTeamId: true,
        homeScore: true, awayScore: true,
      },
    });

    if (games.length === 0) {
      return NextResponse.json({ season, teams: [] });
    }

    // Stats par joueur en playoffs (pour agrégat équipe)
    const playerStats = await prisma.gamePlayerStats.findMany({
      where: {
        game: { season, status: "FINAL", seasonType: "Playoffs" },
      },
      select: {
        teamId: true, minutes: true,
        rebounds: true, assists: true, turnovers: true,
        steals: true, blocks: true,
        fieldGoalsMade: true, fieldGoalsAttempted: true,
        threePointersMade: true, threePointersAttempted: true,
        freeThrowsMade: true, freeThrowsAttempted: true,
      },
    });

    // Construire une map teamId → stats agrégées
    const statsByTeam = new Map<string, {
      wins: number; losses: number; ptsFor: number; ptsAgainst: number; games: Set<string>;
      fgm: number; fga: number; fg3m: number; fg3a: number; ftm: number; fta: number;
      reb: number; ast: number; tov: number; stl: number; blk: number; played: number;
    }>();

    const init = () => ({
      wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, games: new Set<string>(),
      fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
      reb: 0, ast: 0, tov: 0, stl: 0, blk: 0, played: 0,
    });

    // Scores
    for (const g of games) {
      const home = statsByTeam.get(g.homeTeamId) ?? init();
      const away = statsByTeam.get(g.awayTeamId) ?? init();
      const hs = g.homeScore ?? 0;
      const as_ = g.awayScore ?? 0;

      home.games.add(g.id);
      away.games.add(g.id);
      home.ptsFor     += hs;
      home.ptsAgainst += as_;
      away.ptsFor     += as_;
      away.ptsAgainst += hs;
      if (hs > as_) { home.wins++; away.losses++; }
      else          { away.wins++; home.losses++; }

      statsByTeam.set(g.homeTeamId, home);
      statsByTeam.set(g.awayTeamId, away);
    }

    // Shooting + rebonds depuis GamePlayerStats
    for (const ps of playerStats) {
      if (!ps.teamId) continue;
      const t = statsByTeam.get(ps.teamId);
      if (!t) continue;
      if (!ps.minutes || ps.minutes === "0:00") continue; // DNP

      t.fgm += ps.fieldGoalsMade ?? 0;
      t.fga += ps.fieldGoalsAttempted ?? 0;
      t.fg3m += ps.threePointersMade ?? 0;
      t.fg3a += ps.threePointersAttempted ?? 0;
      t.ftm += ps.freeThrowsMade ?? 0;
      t.fta += ps.freeThrowsAttempted ?? 0;
      t.reb += ps.rebounds ?? 0;
      t.ast += ps.assists ?? 0;
      t.tov += ps.turnovers ?? 0;
      t.stl += ps.steals ?? 0;
      t.blk += ps.blocks ?? 0;
      t.played++;
    }

    const pct = (m: number, a: number) => (a > 0 ? m / a : 0);

    const result: PlayoffTeamStats[] = teams
      .filter((t) => statsByTeam.has(t.id))
      .map((t) => {
        const s = statsByTeam.get(t.id)!;
        const gp = s.games.size;
        return {
          teamId:       t.id,
          abbreviation: t.abbreviation,
          city:         t.city,
          name:         t.name,
          primaryColor: t.primaryColor,
          conference:   t.conference,
          wins:         s.wins,
          losses:       s.losses,
          games:        gp,
          ppg:          gp > 0 ? s.ptsFor     / gp : 0,
          oppg:         gp > 0 ? s.ptsAgainst / gp : 0,
          netRating:    gp > 0 ? (s.ptsFor - s.ptsAgainst) / gp : 0,
          fgPct:        pct(s.fgm,  s.fga),
          fg3Pct:       pct(s.fg3m, s.fg3a),
          ftPct:        pct(s.ftm,  s.fta),
          rebPg:        gp > 0 ? s.reb / gp : 0,
          astPg:        gp > 0 ? s.ast / gp : 0,
          tovPg:        gp > 0 ? s.tov / gp : 0,
          stlPg:        gp > 0 ? s.stl / gp : 0,
          blkPg:        gp > 0 ? s.blk / gp : 0,
        };
      })
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    return NextResponse.json({ season, teams: result } satisfies PlayoffTeamsResponse);
  } catch (err) {
    console.error("[playoffs/equipes]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
