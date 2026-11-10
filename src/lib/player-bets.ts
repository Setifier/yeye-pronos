/**
 * Pronos terminés d'un joueur, nuit par nuit, comparés à ceux de celui qui regarde (serveur).
 *
 * Règle : on ne montre que des matchs TERMINÉS et traités (FINAL + catégorie d'écart connue) et des pronos
 * notés (gagné / perdu). Un prono sur un match pas encore joué n'est jamais visible : impossible de copier.
 */

import type { PrismaClient } from "@/generated/prisma";
import { shiftNightDate, toNightDate } from "@/lib/game-night";

export interface ComparedBet {
  teamId: string;
  margin: string | null;
  topScorer: string | null;
  result: "WON" | "LOST";
  points: number;
  basePoints: number;
  marginPoints: number;
  topScorerPoints: number;
  comboPoints: number;
}

export interface ComparedGame {
  id: string;
  gameDate: string;
  homeTeam: { id: string; abbreviation: string; name: string };
  awayTeam: { id: string; abbreviation: string; name: string };
  homeScore: number | null;
  awayScore: number | null;
  /** Catégorie d'écart réelle (SERRE, CLASSIQUE… ou OVERTIME). */
  margin: string | null;
  topScorer: { fullName: string; points: number | null } | null;
  /** Prono du joueur regardé. */
  theirs: ComparedBet | null;
  /** Mon prono (absent si je regarde ma propre page). */
  mine: ComparedBet | null;
}

export interface PlayerNight {
  date: string;
  /** Points du joueur regardé cette nuit-là. */
  points: number;
  bets: number;
  won: number;
  /** Mes points cette nuit-là (null : pas de prono noté, ou ma propre page). */
  myPoints: number | null;
}

const GRADED = ["WON", "LOST"] as const;

async function nightTotals(prisma: PrismaClient, userId: string, season: string) {
  const preds = await prisma.prediction.findMany({
    where: { userId, result: { in: [...GRADED] }, game: { season, status: "FINAL" } },
    select: { pointsEarned: true, result: true, game: { select: { gameDate: true } } },
  });
  const byNight = new Map<string, { points: number; bets: number; won: number }>();
  for (const p of preds) {
    const night = toNightDate(p.game.gameDate);
    const e = byNight.get(night) ?? { points: 0, bets: 0, won: 0 };
    e.points += p.pointsEarned;
    e.bets += 1;
    if (p.result === "WON") e.won += 1;
    byNight.set(night, e);
  }
  return byNight;
}

/** Nuits de la saison où le joueur a des pronos notés (plus récente en premier). */
export async function getPlayerNights(
  prisma: PrismaClient,
  targetId: string,
  viewerId: string,
  season: string
): Promise<PlayerNight[]> {
  const [theirs, mine] = await Promise.all([
    nightTotals(prisma, targetId, season),
    viewerId !== targetId ? nightTotals(prisma, viewerId, season) : Promise.resolve(new Map()),
  ]);
  return [...theirs.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, t]) => ({ date, ...t, myPoints: mine.get(date)?.points ?? null }));
}

type PredictionRow = {
  userId: string;
  predictedTeamId: string;
  predictedScoreMargin: string | null;
  result: string;
  pointsEarned: number;
  marginBonusPoints: number;
  topScorerBonusPoints: number;
  comboBonusPoints: number;
  predictedTopScorer: { fullName: string } | null;
};

function toBet(p: PredictionRow | undefined): ComparedBet | null {
  if (!p || (p.result !== "WON" && p.result !== "LOST")) return null;
  const bonus = p.marginBonusPoints + p.topScorerBonusPoints + p.comboBonusPoints;
  return {
    teamId: p.predictedTeamId,
    margin: p.predictedScoreMargin,
    topScorer: p.predictedTopScorer?.fullName ?? null,
    result: p.result as "WON" | "LOST",
    points: p.pointsEarned,
    basePoints: Math.max(0, p.pointsEarned - bonus),
    marginPoints: p.marginBonusPoints,
    topScorerPoints: p.topScorerBonusPoints,
    comboPoints: p.comboBonusPoints,
  };
}

/** Matchs terminés d'une nuit où l'un des deux a un prono noté, avec les deux pronos. */
export async function getNightComparison(
  prisma: PrismaClient,
  targetId: string,
  viewerId: string,
  night: string
): Promise<ComparedGame[]> {
  const games = await prisma.game.findMany({
    where: {
      gameDate: { gte: new Date(`${night}T00:00:00Z`), lte: new Date(`${shiftNightDate(night, 1)}T15:00:00Z`) },
      status: "FINAL",
      scoreMarginCategory: { not: null },
    },
    orderBy: { gameDate: "asc" },
    select: {
      id: true,
      gameDate: true,
      homeScore: true,
      awayScore: true,
      scoreMarginCategory: true,
      topScorerPoints: true,
      topScorer: { select: { fullName: true } },
      homeTeam: { select: { id: true, abbreviation: true, name: true } },
      awayTeam: { select: { id: true, abbreviation: true, name: true } },
      predictions: {
        where: { userId: { in: [targetId, viewerId] }, result: { in: [...GRADED] } },
        select: {
          userId: true,
          predictedTeamId: true,
          predictedScoreMargin: true,
          result: true,
          pointsEarned: true,
          marginBonusPoints: true,
          topScorerBonusPoints: true,
          comboBonusPoints: true,
          predictedTopScorer: { select: { fullName: true } },
        },
      },
    },
  });

  return games
    .filter((g) => toNightDate(g.gameDate) === night)
    .map((g) => {
      const theirs = toBet(g.predictions.find((p) => p.userId === targetId));
      const mine = viewerId !== targetId ? toBet(g.predictions.find((p) => p.userId === viewerId)) : null;
      return {
        id: g.id,
        gameDate: g.gameDate.toISOString(),
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        margin: g.scoreMarginCategory,
        topScorer: g.topScorer ? { fullName: g.topScorer.fullName, points: g.topScorerPoints } : null,
        theirs,
        mine,
      };
    })
    .filter((g) => g.theirs || g.mine);
}
