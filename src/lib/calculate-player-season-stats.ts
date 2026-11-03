/**
 * Calcul des stats moyennes des joueurs (PlayerSeasonStats)
 * Appelé après chaque match terminé pour mettre à jour les moyennes.
 *
 * Calcul groupé : une lecture pour tous les joueurs concernés, puis un remplacement
 * en une transaction (2 requêtes) — l'ancienne version faisait 2 requêtes par joueur,
 * soit ~50 par match, ce qui pesait lourd dans le budget de 60 s du CRON.
 */

import type { PrismaClient } from "@/generated/prisma";
import { getCurrentSeason } from "@/types/season";

/**
 * Filtre Prisma des matchs comptant pour les stats officielles de saison régulière.
 * La finale de la NBA Cup ne compte pas (règle NBA) ; quarts et demies comptent.
 */
function regularSeasonGameFilter(season: string) {
  return {
    season,
    status: "FINAL" as const,
    seasonType: "Regular Season",
    OR: [{ nbaCupRound: null }, { nbaCupRound: { not: "Championship" } }],
  };
}

const STAT_SELECT = {
  playerId: true,
  minutes: true,
  points: true,
  rebounds: true,
  assists: true,
  steals: true,
  blocks: true,
  turnovers: true,
  fieldGoalsMade: true,
  fieldGoalsAttempted: true,
  threePointersMade: true,
  threePointersAttempted: true,
  freeThrowsMade: true,
  freeThrowsAttempted: true,
  offensiveRebounds: true,
  defensiveRebounds: true,
  plusMinus: true,
  personalFouls: true,
} as const;

interface StatRow {
  playerId: string;
  minutes: string | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fieldGoalsMade: number | null;
  fieldGoalsAttempted: number | null;
  threePointersMade: number | null;
  threePointersAttempted: number | null;
  freeThrowsMade: number | null;
  freeThrowsAttempted: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  plusMinus: number | null;
  personalFouls: number | null;
}

/**
 * Le joueur a-t-il joué ? Exclut les DNP (minutes null, "0:00", "-").
 * Gère "MM:SS" (ESPN) et le décimal "32" / "32.7" (anciennes données BallDontLie).
 */
function played(minutes: string | null): boolean {
  if (!minutes || minutes === "0:00" || minutes === "-") return false;
  const mmss = minutes.match(/^(\d+):(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) > 0 || parseInt(mmss[2], 10) > 0;
  const dec = parseFloat(minutes);
  return !isNaN(dec) && dec > 0;
}

/** "32:45" → 32.75 */
function parseMin(s: string | null): number {
  if (!s) return 0;
  const [m, sec] = s.split(":").map(Number);
  return (m || 0) + (sec || 0) / 60;
}

/** Moyennes et totaux d'un joueur à partir de ses lignes de box score (null s'il n'a pas joué). */
function computeSeasonPayload(rows: StatRow[]) {
  const games = rows.filter((g) => played(g.minutes));
  if (games.length === 0) return null;

  let minutes = 0, points = 0, rebounds = 0, assists = 0, steals = 0, blocks = 0, turnovers = 0;
  let fgm = 0, fga = 0, tpm = 0, tpa = 0, ftm = 0, fta = 0, oreb = 0, dreb = 0, plusMinus = 0, fouls = 0;
  let doubleDoubles = 0, tripleDoubles = 0;

  for (const g of games) {
    minutes   += parseMin(g.minutes);
    points    += g.points || 0;
    rebounds  += g.rebounds || 0;
    assists   += g.assists || 0;
    steals    += g.steals || 0;
    blocks    += g.blocks || 0;
    turnovers += g.turnovers || 0;
    fgm       += g.fieldGoalsMade || 0;
    fga       += g.fieldGoalsAttempted || 0;
    tpm       += g.threePointersMade || 0;
    tpa       += g.threePointersAttempted || 0;
    ftm       += g.freeThrowsMade || 0;
    fta       += g.freeThrowsAttempted || 0;
    oreb      += g.offensiveRebounds || 0;
    dreb      += g.defensiveRebounds || 0;
    plusMinus += g.plusMinus || 0;
    fouls     += g.personalFouls || 0;

    const doubleDigits = [g.points, g.rebounds, g.assists, g.steals, g.blocks].filter((s) => (s || 0) >= 10).length;
    if (doubleDigits >= 3) tripleDoubles++;
    else if (doubleDigits >= 2) doubleDoubles++;
  }

  const n = games.length;
  return {
    gamesPlayed:      n,
    minutesPerGame:   minutes / n,
    pointsPerGame:    points / n,
    reboundsPerGame:  rebounds / n,
    assistsPerGame:   assists / n,
    stealsPerGame:    steals / n,
    blocksPerGame:    blocks / n,
    turnoversPerGame: turnovers / n,
    fieldGoalPct:     fga > 0 ? fgm / fga : 0,
    threePointPct:    tpa > 0 ? tpm / tpa : 0,
    freeThrowPct:     fta > 0 ? ftm / fta : 0,
    totalPoints:      points,
    totalRebounds:    rebounds,
    totalAssists:     assists,
    totalSteals:      steals,
    totalBlocks:      blocks,
    totalTurnovers:   turnovers,
    totalFGM:         fgm,
    totalFGA:         fga,
    total3PM:         tpm,
    total3PA:         tpa,
    totalFTM:         ftm,
    totalFTA:         fta,
    offensiveReboundsPerGame: oreb / n,
    defensiveReboundsPerGame: dreb / n,
    totalOffensiveRebounds:   oreb,
    totalDefensiveRebounds:   dreb,
    fgmPerGame:       fgm / n,
    fgaPerGame:       fga / n,
    threePmPerGame:   tpm / n,
    threePaPerGame:   tpa / n,
    plusMinus,
    doubleDoubles,
    tripleDoubles,
    foulsPerGame:     fouls / n,
    ftmPerGame:       ftm / n,
    ftaPerGame:       fta / n,
  };
}

/**
 * Recalcule les stats saison d'un groupe de joueurs (3 requêtes quel que soit leur nombre).
 * Un joueur sans match joué dans la saison n'a plus de ligne PlayerSeasonStats.
 * @returns nombre de joueurs avec des moyennes
 */
export async function recalculatePlayersSeasonStats(
  playerIds: string[],
  prisma: PrismaClient,
  season: string = getCurrentSeason()
): Promise<number> {
  if (playerIds.length === 0) return 0;

  const rows = await prisma.gamePlayerStats.findMany({
    where:  { playerId: { in: playerIds }, game: regularSeasonGameFilter(season) },
    select: STAT_SELECT,
  });
  const byPlayer = new Map<string, StatRow[]>();
  for (const r of rows) {
    const list = byPlayer.get(r.playerId);
    if (list) list.push(r);
    else byPlayer.set(r.playerId, [r]);
  }

  const data = playerIds.flatMap((playerId) => {
    const payload = computeSeasonPayload(byPlayer.get(playerId) ?? []);
    return payload ? [{ playerId, season, ...payload }] : [];
  });

  await prisma.$transaction([
    prisma.playerSeasonStats.deleteMany({ where: { season, playerId: { in: playerIds } } }),
    prisma.playerSeasonStats.createMany({ data }),
  ]);
  return data.length;
}

/**
 * Recalcule les stats de tous les joueurs qui ont participé à un match.
 * À appeler après qu'un match soit terminé et que les stats aient été récupérées.
 */
export async function recalculatePlayerStatsForGame(
  gameId: string,
  prisma: PrismaClient,
  season: string = getCurrentSeason()
): Promise<number> {
  const players = await prisma.gamePlayerStats.findMany({
    where:    { gameId },
    select:   { playerId: true },
    distinct: ["playerId"],
  });
  await recalculatePlayersSeasonStats(players.map((p) => p.playerId), prisma, season);
  return players.length;
}

/**
 * Recalcule les stats de TOUS les joueurs de la saison (initialisation, correction).
 */
export async function recalculateAllPlayerStats(
  prisma: PrismaClient,
  season: string = getCurrentSeason()
): Promise<void> {
  console.log(`[PLAYER STATS] Recalculating stats for ALL players (${season})...`);

  const players = await prisma.gamePlayerStats.findMany({
    where:    { game: regularSeasonGameFilter(season) },
    select:   { playerId: true },
    distinct: ["playerId"],
  });
  const ids = players.map((p) => p.playerId);
  console.log(`[PLAYER STATS] Found ${ids.length} players with stats this season`);

  const CHUNK = 100;
  let withStats = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    withStats += await recalculatePlayersSeasonStats(ids.slice(i, i + CHUNK), prisma, season);
    console.log(`[PLAYER STATS] Progress: ${Math.min(i + CHUNK, ids.length)}/${ids.length}`);
  }

  console.log(`[PLAYER STATS] Completed: ${withStats} players with averages`);
}
