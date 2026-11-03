/**
 * Classement des joueurs de l'app par saison NBA.
 *
 * Points = pronos match (matchs de la saison) + paris de saison (SpecialPrediction).
 * Avant, le classement additionnait toutes les saisons et ignorait les paris de saison.
 * Ex æquo : même rang (classement "1, 2, 2, 4").
 */

import type { PrismaClient } from "@/generated/prisma";

export interface SeasonRankingEntry {
  rank:          number;
  userId:        string;
  name:          string;
  image:         string | null;
  points:        number;
  matchPoints:   number;
  specialPoints: number;
  predictions:   number; // pronos match (hors annulés)
  won:           number;
  lost:          number;
  pending:       number;
  winRate:       number; // % sur les pronos terminés
}

/** `season` = "2026-27" ou "all" (toutes saisons). */
export async function getSeasonRanking(
  prisma: PrismaClient,
  season: string | "all"
): Promise<SeasonRankingEntry[]> {
  const allSeasons = season === "all";

  const [matchAgg, specialAgg] = await Promise.all([
    prisma.prediction.groupBy({
      by:    ["userId", "result"],
      where: allSeasons ? {} : { game: { season } },
      _sum:  { pointsEarned: true },
      _count: { _all: true },
    }),
    prisma.specialPrediction.groupBy({
      by:    ["userId"],
      where: allSeasons ? {} : { season },
      _sum:  { pointsEarned: true },
    }),
  ]);

  const byUser = new Map<string, Omit<SeasonRankingEntry, "rank" | "name" | "image">>();
  const get = (userId: string) => {
    let e = byUser.get(userId);
    if (!e) {
      e = { userId, points: 0, matchPoints: 0, specialPoints: 0, predictions: 0, won: 0, lost: 0, pending: 0, winRate: 0 };
      byUser.set(userId, e);
    }
    return e;
  };

  for (const row of matchAgg) {
    if (row.result === "CANCELLED") continue;
    const e = get(row.userId);
    e.matchPoints += row._sum.pointsEarned ?? 0;
    e.predictions += row._count._all;
    if (row.result === "WON") e.won += row._count._all;
    if (row.result === "LOST") e.lost += row._count._all;
    if (row.result === "PENDING") e.pending += row._count._all;
  }
  for (const row of specialAgg) {
    get(row.userId).specialPoints += row._sum.pointsEarned ?? 0;
  }

  const users = await prisma.user.findMany({
    where:  { id: { in: [...byUser.keys()] } },
    select: { id: true, name: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const entries = [...byUser.values()]
    .map((e) => {
      const finished = e.won + e.lost;
      return {
        ...e,
        points:  e.matchPoints + e.specialPoints,
        winRate: finished > 0 ? Math.round((e.won / finished) * 1000) / 10 : 0,
        name:    userById.get(e.userId)?.name ?? "Joueur",
        image:   userById.get(e.userId)?.image ?? null,
      };
    })
    .filter((e) => e.predictions > 0 || e.specialPoints > 0)
    .sort((a, b) => b.points - a.points || b.winRate - a.winRate || a.name.localeCompare(b.name));

  let lastPoints = Number.NaN;
  let lastRank = 0;
  return entries.map((e, i) => {
    const rank = e.points === lastPoints ? lastRank : i + 1;
    lastPoints = e.points;
    lastRank = rank;
    return { rank, ...e };
  });
}
