/**
 * Chargement des matchs au format BetGame (serveur uniquement).
 * Une seule requête pour les matchs + pronos de l'utilisateur, une pour les bilans.
 */

import type { PrismaClient } from "@/generated/prisma";
import type { BetGame } from "@/types/bet";
import { predictionDeadlineFor } from "@/types/bet";
import { toNightDate, shiftNightDate } from "@/lib/game-night";

export async function loadBetGames(
  prisma: PrismaClient,
  nightDates: string[],
  userId: string | null
): Promise<BetGame[]> {
  if (nightDates.length === 0) return [];
  const sorted = [...nightDates].sort();
  const wanted = new Set(sorted);

  // Une nuit ET "D" couvre [D 04:00Z, D+1 ~08:00Z] : plage large puis filtrage exact
  const from = new Date(`${sorted[0]}T00:00:00Z`);
  const to   = new Date(`${shiftNightDate(sorted[sorted.length - 1], 1)}T15:00:00Z`);

  const games = await prisma.game.findMany({
    where: {
      gameDate: { gte: from, lte: to },
      NOT: { AND: [{ isIfNecessary: true }, { status: "CANCELLED" }] },
    },
    orderBy: { gameDate: "asc" },
    select: {
      id: true,
      season: true,
      gameDate: true,
      predictionDeadline: true,
      status: true,
      homeScore: true,
      awayScore: true,
      currentPeriod: true,
      gameClock: true,
      seasonType: true,
      nbaCupRound: true,
      isIfNecessary: true,
      gameNumber: true,
      scoreMarginCategory: true,
      topScorerPoints: true,
      topScorer: { select: { fullName: true } },
      homeTeam: { select: { id: true, abbreviation: true, name: true, city: true } },
      awayTeam: { select: { id: true, abbreviation: true, name: true, city: true } },
      // Sans utilisateur : filtre qui ne renvoie rien (garde un type de résultat unique)
      predictions: {
        where: { userId: userId ?? "" },
        select: {
          predictedTeamId: true,
          predictedScoreMargin: true,
          result: true,
          pointsEarned: true,
          marginBonusPoints: true,
          topScorerBonusPoints: true,
          comboBonusPoints: true,
          predictedTopScorer: { select: { id: true, fullName: true, headshot: true } },
        },
      },
    },
  });

  const inNights = games.filter((g) => wanted.has(toNightDate(g.gameDate)));
  if (inNights.length === 0) return [];

  // Bilans V-D des équipes (saison du match)
  const seasons = [...new Set(inNights.map((g) => g.season))];
  const teamIds = [...new Set(inNights.flatMap((g) => [g.homeTeam.id, g.awayTeam.id]))];
  const stats = await prisma.teamSeasonStats.findMany({
    where:  { season: { in: seasons }, teamId: { in: teamIds } },
    select: { teamId: true, season: true, wins: true, losses: true },
  });
  const record = new Map(stats.map((s) => [`${s.season}|${s.teamId}`, `${s.wins}-${s.losses}`]));

  return inNights.map((g) => {
    const p = g.predictions[0];
    return {
      id: g.id,
      nightDate: toNightDate(g.gameDate),
      gameDate: g.gameDate.toISOString(),
      // Recalculée depuis l'heure du match (règle : clôture au coup d'envoi)
      predictionDeadline: predictionDeadlineFor(g.gameDate).toISOString(),
      status: g.status,
      homeTeam: { ...g.homeTeam, record: record.get(`${g.season}|${g.homeTeam.id}`) ?? null },
      awayTeam: { ...g.awayTeam, record: record.get(`${g.season}|${g.awayTeam.id}`) ?? null },
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      currentPeriod: g.currentPeriod,
      gameClock: g.gameClock,
      seasonType: g.seasonType,
      nbaCupRound: g.nbaCupRound,
      isIfNecessary: g.isIfNecessary,
      gameNumber: g.gameNumber,
      scoreMarginCategory: g.scoreMarginCategory,
      topScorer: g.topScorer ? { fullName: g.topScorer.fullName, points: g.topScorerPoints } : null,
      prediction: p
        ? {
            predictedTeamId: p.predictedTeamId,
            predictedScoreMargin: p.predictedScoreMargin,
            predictedTopScorer: p.predictedTopScorer,
            result: p.result,
            pointsEarned: p.pointsEarned,
            marginBonusPoints: p.marginBonusPoints,
            topScorerBonusPoints: p.topScorerBonusPoints,
            comboBonusPoints: p.comboBonusPoints,
          }
        : null,
    };
  });
}

/**
 * Dernières nuits avec des matchs avant `beforeNight` (au plus `lookback` jours en arrière).
 */
export async function findPreviousNightWithGames(
  prisma: PrismaClient,
  beforeNight: string,
  lookback = 7
): Promise<string | null> {
  const from = new Date(`${shiftNightDate(beforeNight, -lookback)}T00:00:00Z`);
  const to   = new Date(`${beforeNight}T12:00:00Z`);
  const last = await prisma.game.findFirst({
    where:   { gameDate: { gte: from, lt: to }, status: { not: "CANCELLED" } },
    orderBy: { gameDate: "desc" },
    select:  { gameDate: true },
  });
  if (!last) return null;
  const night = toNightDate(last.gameDate);
  return night < beforeNight ? night : shiftNightDate(beforeNight, -1);
}

/** Prochaine nuit avec des matchs à partir de `fromNight` (incluse). */
export async function findNextNightWithGames(
  prisma: PrismaClient,
  fromNight: string
): Promise<string | null> {
  const next = await prisma.game.findFirst({
    where:   { gameDate: { gte: new Date(`${fromNight}T12:00:00Z`) }, status: "SCHEDULED" },
    orderBy: { gameDate: "asc" },
    select:  { gameDate: true },
  });
  return next ? toNightDate(next.gameDate) : null;
}
