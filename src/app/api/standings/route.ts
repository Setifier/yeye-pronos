/**
 * GET /api/standings?season=2026-27
 *
 * Classement NBA par conférence, départages dans src/lib/standings-ranking.ts :
 *   1. % de victoires  2. confrontations directes  3. bilan en conférence  4. différentiel
 *
 * Response: { season, EAST: StandingsTeam[], WEST: StandingsTeam[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";
import { rankConference, gbString } from "@/lib/standings-ranking";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StandingsTeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  primaryColor: string | null;
  // Record
  wins: number;
  losses: number;
  winPct: number;
  gb: string;
  // Split records
  homeRecord: string;
  awayRecord: string;
  conferenceRecord: string;
  divisionRecord: string;
  last10Record: string;
  currentStreak: string;
  // Advanced
  pointDifferential: number;
  // Rank
  conferenceRank: number;
  // Playoff status after Play-In
  playoffStatus: "direct" | "play-in" | "lottery";
}

interface TeamRow {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  primaryColor: string | null;
  wins: number;
  losses: number;
  winPct: number;
  homeRecord: string;
  awayRecord: string;
  conferenceRecord: string;
  divisionRecord: string;
  last10Record: string;
  currentStreak: string;
  pointDifferential: number;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const season = req.nextUrl.searchParams.get("season") ?? getCurrentSeason();

    const teams = await prisma.team.findMany({
      where: { conference: { in: ["EAST", "WEST"] } },
      select: {
        id:           true,
        name:         true,
        city:         true,
        abbreviation: true,
        conference:   true,
        division:     true,
        primaryColor: true,
        seasonStats: {
          where:  { season },
          select: {
            wins:               true,
            losses:             true,
            winPct:             true,
            homeRecord:         true,
            awayRecord:         true,
            conferenceRecord:   true,
            divisionRecord:     true,
            last10Record:       true,
            currentStreak:      true,
            pointDifferential:  true,
          },
        },
      },
    });

    // Shape into TeamRow — les 30 équipes apparaissent toujours (0-0 en tout début de saison)
    const EMPTY = {
      wins: 0, losses: 0, winPct: 0, homeRecord: null, awayRecord: null, conferenceRecord: null,
      divisionRecord: null, last10Record: null, currentStreak: null, pointDifferential: 0,
    };
    const rows: TeamRow[] = teams
      .map((t) => {
        const s = t.seasonStats[0] ?? EMPTY;
        return {
          id:               t.id,
          name:             t.name,
          city:             t.city,
          abbreviation:     t.abbreviation,
          conference:       t.conference,
          division:         t.division ?? "",
          primaryColor:     t.primaryColor,
          wins:             s.wins,
          losses:           s.losses,
          winPct:           s.winPct,
          homeRecord:       s.homeRecord   ?? "0-0",
          awayRecord:       s.awayRecord   ?? "0-0",
          conferenceRecord: s.conferenceRecord ?? "0-0",
          divisionRecord:   s.divisionRecord   ?? "0-0",
          last10Record:     s.last10Record ?? "0-0",
          currentStreak:    s.currentStreak ?? "-",
          pointDifferential: s.pointDifferential ?? 0,
        };
      });

    const eastRows = rows.filter((r) => r.conference === "EAST");
    const westRows = rows.filter((r) => r.conference === "WEST");

    const [eastSorted, westSorted] = await Promise.all([
      rankConference(eastRows, season),
      rankConference(westRows, season),
    ]);

    const toResponse = (sorted: TeamRow[]): StandingsTeam[] => {
      const leader = sorted[0];
      return sorted.map((t, idx) => ({
        ...t,
        gb:             leader ? gbString(t.wins, t.losses, leader.wins, leader.losses) : "-",
        conferenceRank: idx + 1,
        playoffStatus:  idx < 6 ? "direct" : idx < 10 ? "play-in" : "lottery",
      }));
    };

    return NextResponse.json({
      season,
      EAST: toResponse(eastSorted),
      WEST: toResponse(westSorted),
    });
  } catch (err) {
    console.error("[standings]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
