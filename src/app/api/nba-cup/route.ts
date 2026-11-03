import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamStanding {
  teamId:        string;
  abbreviation:  string;
  city:          string;
  name:          string;
  logoUrl:       string | null;
  primaryColor:  string | null;
  wins:          number;
  losses:        number;
  gamesPlayed:   number;
  pointsFor:     number;
  pointsAgainst: number;
  pointDiff:     number;
  // Head-to-head results vs other teams in group
  h2h:           Record<string, { wins: number; losses: number }>;
  // Qualification status
  qualStatus:    "x" | "wc" | "ko" | "--" | "o" | null;
}

export interface GroupData {
  groupKey:   string;           // "East-A"
  conference: "East" | "West";
  group:      "A" | "B" | "C";
  standings:  TeamStanding[];
}

export interface KnockoutGame {
  id:          string;
  externalId:  string;
  gameDate:    string;
  status:      string;
  homeTeam:    TeamInfo;
  awayTeam:    TeamInfo;
  homeScore:   number | null;
  awayScore:   number | null;
  winnerId:    string | null;
}

export interface TeamInfo {
  id:           string;
  abbreviation: string;
  city:         string;
  name:         string;
  logoUrl:      string | null;
  primaryColor: string | null;
  conference:   string;
}

export interface NbaCupApiResponse {
  season:  string;
  groups:  Record<"East" | "West", GroupData[]>;
  knockout: {
    quarterfinals: KnockoutGame[];
    semifinals:    KnockoutGame[];
    championship:  KnockoutGame[];
  };
}

// ─── Qualification logic ──────────────────────────────────────────────────────

/**
 * Determine qualification status for all teams across all groups of a conference.
 * Rules (applied once season is over, i.e. no more group play games):
 *   - Group winner (#1 per group)           → "x"
 *   - Best #2 across 3 groups (wild card)   → "wc"
 *   - Other #2 teams                        → "o"
 *   - Ranks 3–5                             → "o"
 *
 * Tiebreaker (within a group, for ranking):
 *   1. Wins
 *   2. H2H record (within group)
 *   3. Point differential (group play only)
 *   4. Total points scored
 */
function compareTeams(a: TeamStanding, b: TeamStanding): number {
  if (b.wins !== a.wins) return b.wins - a.wins;
  // H2H
  const aVsB = a.h2h[b.teamId];
  const bVsA = b.h2h[a.teamId];
  if (aVsB && bVsA) {
    if (aVsB.wins !== bVsA.wins) return bVsA.wins - aVsB.wins;
  }
  // Point diff
  if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
  // Total points
  return b.pointsFor - a.pointsFor;
}

function assignQualStatus(groups: GroupData[]): void {
  // Sort each group
  for (const g of groups) {
    g.standings.sort(compareTeams);
  }

  // Group winners
  const groupWinners = groups.map((g) => g.standings[0]).filter(Boolean);
  for (const t of groupWinners) t.qualStatus = "x";

  // Wild card candidates = rank-2 teams (one per group)
  const rank2Teams = groups
    .map((g) => g.standings[1])
    .filter(Boolean)
    .sort(compareTeams);

  if (rank2Teams.length > 0) {
    rank2Teams[0].qualStatus = "wc";
    for (let i = 1; i < rank2Teams.length; i++) {
      rank2Teams[i].qualStatus = "o";
    }
  }

  // Ranks 3–5 → eliminated
  for (const g of groups) {
    for (let i = 2; i < g.standings.length; i++) {
      g.standings[i].qualStatus = "o";
    }
  }
}

// ─── GET /api/nba-cup ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const season = request.nextUrl.searchParams.get("season") ?? getCurrentSeason();

    // Tous les matchs NBA Cup de la saison
    const allGames = await prisma.game.findMany({
      where: { season, nbaCupRound: { not: null } },
      include: {
        homeTeam: { select: { id: true, abbreviation: true, city: true, name: true, logoUrl: true, primaryColor: true, conference: true } },
        awayTeam: { select: { id: true, abbreviation: true, city: true, name: true, logoUrl: true, primaryColor: true, conference: true } },
      },
      orderBy: { gameDate: "asc" },
    });

    const groupPlayGames = allGames.filter((g) => g.nbaCupRound === "GroupPlay");
    const knockoutGames  = allGames.filter((g) => g.nbaCupRound !== "GroupPlay");

    // ── Build group standings from groupPlayGames ────────────────────────────

    // teamId → TeamStanding
    const teamMap = new Map<string, TeamStanding>();

    // groupKey → Set<teamId>
    const groupTeams = new Map<string, Set<string>>();

    const initTeam = (t: typeof allGames[0]["homeTeam"]): TeamStanding => ({
      teamId:        t.id,
      abbreviation:  t.abbreviation,
      city:          t.city,
      name:          t.name,
      logoUrl:       t.logoUrl,
      primaryColor:  t.primaryColor,
      wins:          0,
      losses:        0,
      gamesPlayed:   0,
      pointsFor:     0,
      pointsAgainst: 0,
      pointDiff:     0,
      h2h:           {},
      qualStatus:    null,
    });

    for (const game of groupPlayGames) {
      const groupKey = game.nbaCupGroup;

      for (const team of [game.homeTeam, game.awayTeam]) {
        if (!teamMap.has(team.id)) teamMap.set(team.id, initTeam(team));

        if (groupKey) {
          if (!groupTeams.has(groupKey)) groupTeams.set(groupKey, new Set());
          groupTeams.get(groupKey)!.add(team.id);
        }
      }

      if (game.status !== "FINAL" || game.homeScore === null || game.awayScore === null) continue;

      const home = teamMap.get(game.homeTeam.id)!;
      const away = teamMap.get(game.awayTeam.id)!;

      home.gamesPlayed++;
      away.gamesPlayed++;
      home.pointsFor     += game.homeScore;
      home.pointsAgainst += game.awayScore;
      away.pointsFor     += game.awayScore;
      away.pointsAgainst += game.homeScore;

      const homeWon = game.homeScore > game.awayScore;
      if (homeWon) {
        home.wins++;
        away.losses++;
      } else {
        away.wins++;
        home.losses++;
      }

      home.pointDiff = home.pointsFor - home.pointsAgainst;
      away.pointDiff = away.pointsFor - away.pointsAgainst;

      // H2H
      if (!home.h2h[away.teamId]) home.h2h[away.teamId] = { wins: 0, losses: 0 };
      if (!away.h2h[home.teamId]) away.h2h[home.teamId] = { wins: 0, losses: 0 };
      if (homeWon) { home.h2h[away.teamId].wins++; away.h2h[home.teamId].losses++; }
      else         { home.h2h[away.teamId].losses++; away.h2h[home.teamId].wins++; }
    }

    // Build GroupData objects
    const groupsMap = new Map<string, GroupData>();

    for (const [groupKey, teamIds] of groupTeams) {
      const parts = groupKey.split("-");
      if (parts.length !== 2) continue;
      const conference = parts[0] as "East" | "West";
      const group      = parts[1] as "A" | "B" | "C";

      const standings = [...teamIds]
        .map((id) => teamMap.get(id))
        .filter((t): t is TeamStanding => !!t);

      groupsMap.set(groupKey, { groupKey, conference, group, standings });
    }

    // Assign qual status per conference
    for (const conf of ["East", "West"] as const) {
      const confGroups = ["A", "B", "C"]
        .map((g) => groupsMap.get(`${conf}-${g}`))
        .filter((g): g is GroupData => !!g);
      assignQualStatus(confGroups);
    }

    // Final grouped output ordered by A→B→C
    const groups: Record<"East" | "West", GroupData[]> = { East: [], West: [] };
    for (const conf of ["East", "West"] as const) {
      for (const g of ["A", "B", "C"] as const) {
        const gd = groupsMap.get(`${conf}-${g}`);
        if (gd) groups[conf].push(gd);
      }
    }

    // ── Knockout ─────────────────────────────────────────────────────────────

    const fmt = (game: typeof knockoutGames[0]): KnockoutGame => ({
      id:         game.id,
      externalId: game.externalId,
      gameDate:   game.gameDate.toISOString(),
      status:     game.status,
      homeTeam:   { id: game.homeTeam.id, abbreviation: game.homeTeam.abbreviation, city: game.homeTeam.city, name: game.homeTeam.name, logoUrl: game.homeTeam.logoUrl, primaryColor: game.homeTeam.primaryColor, conference: game.homeTeam.conference },
      awayTeam:   { id: game.awayTeam.id, abbreviation: game.awayTeam.abbreviation, city: game.awayTeam.city, name: game.awayTeam.name, logoUrl: game.awayTeam.logoUrl, primaryColor: game.awayTeam.primaryColor, conference: game.awayTeam.conference },
      homeScore:  game.homeScore,
      awayScore:  game.awayScore,
      winnerId:   game.winnerId,
    });

    const knockout = {
      quarterfinals: knockoutGames.filter((g) => g.nbaCupRound === "Quarterfinal").map(fmt),
      semifinals:    knockoutGames.filter((g) => g.nbaCupRound === "Semifinal").map(fmt),
      championship:  knockoutGames.filter((g) => g.nbaCupRound === "Championship").map(fmt),
    };

    return NextResponse.json({ season, groups, knockout });
  } catch (error) {
    console.error("[API] NBA Cup error:", error);
    return NextResponse.json({ error: "Failed to fetch NBA Cup data" }, { status: 500 });
  }
}
