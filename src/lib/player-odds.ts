/**
 * Moyenne de points "de référence" pour la cote du meilleur marqueur.
 *
 * Problème corrigé : en début de saison, aucun joueur n'a encore de stats sur la saison
 * en cours → moyenne 0 → cote maximale (40 pts) pour tout le monde, stars comprises.
 *
 * Règle :
 *   - ≥ 10 matchs joués cette saison           → moyenne de la saison en cours
 *   - < 10 matchs ET saison précédente connue  → mélange progressif :
 *       (moyenne actuelle × n + moyenne précédente × (10 − n)) / 10
 *   - pas de saison précédente (rookie)         → moyenne actuelle (0 si aucun match → cote max)
 *
 * La même fonction sert à AFFICHER la cote et à CALCULER les points,
 * pour que la cote vue au moment du prono corresponde aux points gagnés.
 */

import type { PrismaClient } from "@/generated/prisma";
import { getPreviousSeason } from "@/types/season";

export const ODDS_STABILIZATION_GAMES = 10;
/** En dessous de ce nombre de matchs, la saison précédente n'est pas jugée représentative. */
const MIN_PREVIOUS_GAMES = 5;

export interface ReferencePpg {
  ppg:            number;
  currentPpg:     number;
  currentGames:   number;
  previousPpg:    number | null;
  source:         "current" | "blended" | "previous" | "none";
}

export function blendPpg(
  current: { ppg: number; games: number } | null,
  previous: { ppg: number; games: number } | null
): ReferencePpg {
  const currentPpg   = current?.ppg ?? 0;
  const currentGames = current?.games ?? 0;
  const prevUsable   = previous && previous.games >= MIN_PREVIOUS_GAMES ? previous.ppg : null;

  if (currentGames >= ODDS_STABILIZATION_GAMES || prevUsable === null) {
    return {
      ppg: currentPpg,
      currentPpg,
      currentGames,
      previousPpg: prevUsable,
      source: currentGames > 0 ? "current" : "none",
    };
  }

  const w = currentGames / ODDS_STABILIZATION_GAMES;
  return {
    ppg: currentPpg * w + prevUsable * (1 - w),
    currentPpg,
    currentGames,
    previousPpg: prevUsable,
    source: currentGames === 0 ? "previous" : "blended",
  };
}

/**
 * Moyenne de référence pour une liste de joueurs (2 requêtes au total).
 */
export async function getReferencePpgMap(
  prisma: PrismaClient,
  playerIds: string[],
  season: string
): Promise<Map<string, ReferencePpg>> {
  const ids = [...new Set(playerIds.filter(Boolean))];
  const result = new Map<string, ReferencePpg>();
  if (ids.length === 0) return result;

  const previousSeason = getPreviousSeason(season);
  const rows = await prisma.playerSeasonStats.findMany({
    where:  { playerId: { in: ids }, season: { in: [season, previousSeason] } },
    select: { playerId: true, season: true, pointsPerGame: true, gamesPlayed: true },
  });

  const current  = new Map<string, { ppg: number; games: number }>();
  const previous = new Map<string, { ppg: number; games: number }>();
  for (const r of rows) {
    const target = r.season === season ? current : previous;
    target.set(r.playerId, { ppg: r.pointsPerGame, games: r.gamesPlayed });
  }

  for (const id of ids) {
    result.set(id, blendPpg(current.get(id) ?? null, previous.get(id) ?? null));
  }
  return result;
}

/** A-t-il joué ? (mêmes règles que les moyennes de saison : DNP exclus) */
function hasPlayed(minutes: string | null): boolean {
  if (!minutes || minutes === "0:00" || minutes === "-") return false;
  const mmss = minutes.match(/^(\d+):(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) > 0 || parseInt(mmss[2], 10) > 0;
  const dec = parseFloat(minutes);
  return !isNaN(dec) && dec > 0;
}

/**
 * Moyenne de référence telle qu'elle était juste AVANT un match (`before` = coup d'envoi) : pour recalculer
 * une cote après coup (correctifs) comme si le match était noté le soir même. Saison en cours reconstituée
 * depuis les box scores (saison régulière, finale NBA Cup exclue, DNP exclus), saison précédente telle quelle.
 */
export async function getReferencePpgBefore(
  prisma: PrismaClient,
  playerIds: string[],
  season: string,
  before: Date
): Promise<Map<string, ReferencePpg>> {
  const ids = [...new Set(playerIds.filter(Boolean))];
  const result = new Map<string, ReferencePpg>();
  if (ids.length === 0) return result;

  const [lines, prevRows] = await Promise.all([
    prisma.gamePlayerStats.findMany({
      where: {
        playerId: { in: ids },
        game: {
          season,
          status: "FINAL",
          seasonType: "Regular Season",
          gameDate: { lt: before },
          OR: [{ nbaCupRound: null }, { nbaCupRound: { not: "Championship" } }],
        },
      },
      select: { playerId: true, points: true, minutes: true },
    }),
    prisma.playerSeasonStats.findMany({
      where:  { playerId: { in: ids }, season: getPreviousSeason(season) },
      select: { playerId: true, pointsPerGame: true, gamesPlayed: true },
    }),
  ]);

  const totals = new Map<string, { points: number; games: number }>();
  for (const l of lines) {
    if (!hasPlayed(l.minutes)) continue;
    const t = totals.get(l.playerId) ?? { points: 0, games: 0 };
    t.points += l.points;
    t.games += 1;
    totals.set(l.playerId, t);
  }
  const previous = new Map(prevRows.map((r) => [r.playerId, { ppg: r.pointsPerGame, games: r.gamesPlayed }]));

  for (const id of ids) {
    const t = totals.get(id);
    result.set(id, blendPpg(t ? { ppg: t.points / t.games, games: t.games } : null, previous.get(id) ?? null));
  }
  return result;
}
