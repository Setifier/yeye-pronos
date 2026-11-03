/**
 * Rang des équipes dans leur conférence, avec départages :
 *   1. % de victoires  2. confrontations directes  3. bilan en conférence  4. différentiel de points
 *
 * Règle unique partagée par /api/standings (affichage) et le pipeline, qui enregistre
 * conferenceRank / divisionRank dans TeamSeasonStats (fiche équipe, archives).
 */

import { prisma } from "@/lib/prisma";

export interface RankableTeam {
  id: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  winPct: number;
  conferenceRecord: string;
  pointDifferential: number;
}

export function parseRecord(record: string | null | undefined): { wins: number; losses: number } {
  if (!record) return { wins: 0, losses: 0 };
  const parts = record.split("-");
  return {
    wins:   parseInt(parts[0] ?? "0", 10) || 0,
    losses: parseInt(parts[1] ?? "0", 10) || 0,
  };
}

export function gbString(teamWins: number, teamLosses: number, leaderWins: number, leaderLosses: number): string {
  if (teamWins === leaderWins && teamLosses === leaderLosses) return "-";
  const gb = ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2;
  return gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1);
}

/** Regroupe un tableau trié en séries d'équipes au même % de victoires. */
function tiedGroups<T extends { winPct: number }>(sorted: T[]): T[][] {
  const groups: T[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && Math.abs(sorted[j].winPct - sorted[i].winPct) < 1e-6) j++;
    groups.push(sorted.slice(i, j));
    i = j;
  }
  return groups;
}

/** Trie les équipes d'une conférence (1re → dernière). */
export async function rankConference<T extends RankableTeam>(rows: T[], season: string): Promise<T[]> {
  const sorted = [...rows].sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  const result: T[] = [];

  for (const group of tiedGroups(sorted)) {
    if (group.length === 1) {
      result.push(...group);
      continue;
    }

    // Départage 1 : confrontations directes entre les équipes à égalité
    const teamIds = group.map((t) => t.id);
    const h2hGames = await prisma.game.findMany({
      where: {
        season,
        seasonType: "Regular Season",
        status:     "FINAL",
        homeTeamId: { in: teamIds },
        awayTeamId: { in: teamIds },
      },
      select: { winnerId: true },
    });
    const h2hWins = new Map<string, number>(teamIds.map((id) => [id, 0]));
    for (const g of h2hGames) {
      if (g.winnerId && h2hWins.has(g.winnerId)) h2hWins.set(g.winnerId, (h2hWins.get(g.winnerId) ?? 0) + 1);
    }

    // Départages 2 et 3 : bilan en conférence, puis différentiel
    result.push(...[...group].sort((a, b) => {
      const h2h = (h2hWins.get(b.id) ?? 0) - (h2hWins.get(a.id) ?? 0);
      if (h2h !== 0) return h2h;
      const conf = parseRecord(b.conferenceRecord).wins - parseRecord(a.conferenceRecord).wins;
      if (conf !== 0) return conf;
      return b.pointDifferential - a.pointDifferential;
    }));
  }

  return result;
}

/**
 * Enregistre le rang en conférence et en division de chaque équipe de la saison.
 * À appeler après un recalcul du classement. Renvoie le nombre d'équipes classées.
 */
export async function updateStandingRanks(season: string): Promise<number> {
  const teams = await prisma.team.findMany({
    where:  { conference: { in: ["EAST", "WEST"] } },
    select: {
      id: true, conference: true, division: true,
      seasonStats: {
        where:  { season },
        select: { id: true, wins: true, losses: true, winPct: true, conferenceRecord: true, pointDifferential: true },
      },
    },
  });

  const rows = teams.flatMap((t) => {
    const s = t.seasonStats[0];
    if (!s) return [];
    return [{
      id:                t.id,
      statsId:           s.id,
      conference:        t.conference as string,
      division:          t.division,
      wins:              s.wins,
      losses:            s.losses,
      winPct:            s.winPct,
      conferenceRecord:  s.conferenceRecord ?? "0-0",
      pointDifferential: s.pointDifferential,
    }];
  });

  const updates: ReturnType<typeof prisma.teamSeasonStats.update>[] = [];
  for (const conference of ["EAST", "WEST"]) {
    const ranked = await rankConference(rows.filter((r) => r.conference === conference), season);
    const perDivision = new Map<string, number>();
    for (const [i, r] of ranked.entries()) {
      const divisionRank = (perDivision.get(r.division) ?? 0) + 1;
      perDivision.set(r.division, divisionRank);
      updates.push(prisma.teamSeasonStats.update({
        where: { id: r.statsId },
        data:  { conferenceRank: i + 1, divisionRank },
      }));
    }
  }
  if (updates.length > 0) await prisma.$transaction(updates);
  return updates.length;
}
