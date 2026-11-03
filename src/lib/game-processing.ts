/**
 * Traitement des matchs terminés + pipeline quotidien
 *
 * Un match est "à traiter" quand il est FINAL mais n'a pas encore de
 * `scoreMarginCategory` (posé uniquement par ce traitement). Ce marqueur rend
 * le pipeline idempotent : on peut relancer CRON ou scripts sans risque.
 *
 * Pour chaque match terminé :
 *   1. Box score ESPN → GamePlayerStats (+ création des joueurs manquants)
 *   2. Écart, prolongation, meilleur marqueur → Game
 *   3. Calcul des pronos en attente (base + écart + top scorer + combo)
 *   4. Moyennes saison des joueurs (saison régulière uniquement)
 * Puis, pour l'ensemble des matchs traités :
 *   5. Classement des équipes concernées
 *   6. Séries playoffs + annulation des matchs if-necessary
 */

import type { PrismaClient } from "@/generated/prisma";
import { fetchAndSaveGameStats } from "@/lib/espn-stats";
import { recalculatePlayerStatsForGame } from "@/lib/calculate-player-season-stats";
import { updateStandingRanks } from "@/lib/standings-ranking";
import { ensureNbaCupGroups } from "@/lib/nba-cup-groups";
import { calculateStandings } from "@/lib/standings-calculator";
import { updateSeriesAfterGame, cancelIfNecessaryGames } from "@/lib/playoff-series";
import { getReferencePpgMap } from "@/lib/player-odds";
import { syncSchedule, type ScheduleSyncResult } from "@/lib/game-sync";
import { toEasternDateString, shiftDate } from "@/lib/espn";
import {
  getScoreMarginCategory,
  calculateTotalPoints,
  ScoreMarginCategory,
} from "@/types/bonus";
import { getCurrentSeason } from "@/types/season";

type Logger = (msg: string) => void;

/** Sans box score ESPN, on retente pendant 36 h avant de calculer les pronos sans top scorer. */
const BOXSCORE_RETRY_WINDOW_MS = 36 * 60 * 60 * 1000;

export interface ProcessedGame {
  gameId:      string;
  externalId:  string;
  label:       string;
  deferred:    boolean; // box score pas encore dispo → retenté plus tard
  topScorer:   { name: string; points: number } | null;
  predictions: number;
  players:     number;
}

/** Matchs FINAL pas encore traités (du plus ancien au plus récent). */
export async function findUnprocessedFinalGames(
  prisma: PrismaClient,
  season: string,
  limit?: number
) {
  return prisma.game.findMany({
    where: {
      season,
      status: "FINAL",
      scoreMarginCategory: null,
      homeScore: { not: null },
      awayScore: { not: null },
    },
    orderBy: { gameDate: "asc" },
    take: limit,
    select: { id: true },
  });
}

/**
 * Traite un match FINAL. Ne relance pas le classement (fait en lot par le pipeline).
 */
export async function processFinalGame(
  prisma: PrismaClient,
  gameId: string,
  opts: { season?: string; log?: Logger; force?: boolean } = {}
): Promise<ProcessedGame | null> {
  const log = opts.log ?? (() => {});

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      externalId: true,
      season: true,
      seasonType: true,
      gameDate: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      currentPeriod: true,
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  });

  if (!game || game.homeScore === null || game.awayScore === null) return null;

  const season = opts.season ?? game.season;
  const label  = `${game.awayTeam.abbreviation} ${game.awayScore} @ ${game.homeScore} ${game.homeTeam.abbreviation}`;

  // ── 1. Box score ──────────────────────────────────────────────
  let topScorer: Awaited<ReturnType<typeof fetchAndSaveGameStats>> = null;
  try {
    topScorer = await fetchAndSaveGameStats(game.externalId, game.id);
  } catch (err) {
    log(`  ⚠️  Box score ${game.externalId} : ${err instanceof Error ? err.message : String(err)}`);
  }

  const age = Date.now() - game.gameDate.getTime();
  if (!topScorer && age < BOXSCORE_RETRY_WINDOW_MS && !opts.force) {
    log(`  ⏳ ${label} — box score pas encore disponible, nouvel essai au prochain passage`);
    return {
      gameId: game.id, externalId: game.externalId, label, deferred: true,
      topScorer: null, predictions: 0, players: 0,
    };
  }

  // ── 2. Infos du match ─────────────────────────────────────────
  const homeScore   = game.homeScore;
  const awayScore   = game.awayScore;
  const periods     = game.currentPeriod ?? 4;
  const hasOvertime = periods > 4;
  const scoreMarginCategory = getScoreMarginCategory(homeScore, awayScore, hasOvertime);
  const winnerId    = homeScore > awayScore ? game.homeTeamId : game.awayTeamId;

  // ── 3. Pronos (AVANT la mise à jour des moyennes : la cote se base sur la moyenne d'avant-match)
  const predictions = await prisma.prediction.findMany({
    where:  { gameId: game.id, result: "PENDING" },
    select: { id: true, predictedTeamId: true, predictedScoreMargin: true, predictedTopScorerId: true },
  });

  const ppgMap = await getReferencePpgMap(
    prisma,
    predictions.map((p) => p.predictedTopScorerId).filter((id): id is string => !!id),
    season
  );

  for (const p of predictions) {
    const didWin = p.predictedTeamId === winnerId;
    const bonus  = calculateTotalPoints({
      predictionWon:             didWin,
      predictedMargin:           p.predictedScoreMargin as ScoreMarginCategory | null,
      actualMargin:              scoreMarginCategory,
      predictedTopScorerId:      p.predictedTopScorerId,
      actualTopScorerId:         topScorer?.playerId ?? null,
      predictedTopScorerAverage: p.predictedTopScorerId ? ppgMap.get(p.predictedTopScorerId)?.ppg ?? 0 : 0,
    });

    await prisma.prediction.update({
      where: { id: p.id },
      data: {
        result:               didWin ? "WON" : "LOST",
        pointsEarned:         bonus.total,
        marginBonusPoints:    bonus.marginBonus,
        topScorerBonusPoints: bonus.topScorerBonus,
        comboBonusPoints:     bonus.comboBonus,
      },
    });
  }

  // Marquer le match comme traité (scoreMarginCategory = marqueur)
  await prisma.game.update({
    where: { id: game.id },
    data: {
      winnerId,
      topScorerId:       topScorer?.playerId ?? null,
      topScorerPoints:   topScorer?.points ?? null,
      actualScoreMargin: Math.abs(homeScore - awayScore),
      scoreMarginCategory,
      hasOvertime,
      overtimePeriods:   hasOvertime ? periods - 4 : null,
    },
  });

  // ── 4. Moyennes joueurs (saison régulière seulement) ─────────
  let players = 0;
  if (game.seasonType === "Regular Season" && topScorer) {
    try {
      players = await recalculatePlayerStatsForGame(game.id, prisma, season);
    } catch (err) {
      log(`  ⚠️  Moyennes joueurs ${game.externalId} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log(
    `  ✓ ${label}${hasOvertime ? " (OT)" : ""} · top ${topScorer ? `${topScorer.playerName} ${topScorer.points} pts` : "inconnu"}` +
    ` · ${predictions.length} prono(s)` +
    (players > 0 ? ` · moyennes de ${players} joueur(s)` : "")
  );

  return {
    gameId: game.id,
    externalId: game.externalId,
    label,
    deferred: false,
    topScorer: topScorer ? { name: topScorer.playerName, points: topScorer.points } : null,
    predictions: predictions.length,
    players,
  };
}

// ============================================
// PIPELINE COMPLET
// ============================================

export interface PipelineResult {
  season:     string;
  schedule:   ScheduleSyncResult | null;
  processed:  ProcessedGame[];
  remaining:  number; // matchs FINAL encore à traiter (budget temps dépassé)
  standings:  number; // équipes recalculées
  series:     { completed: number; ifNecessaryCancelled: number };
  durationMs: number;
}

/**
 * Pipeline : calendrier → matchs terminés → classement → séries.
 *
 * @param syncFrom / syncTo  plage de dates US Eastern à synchroniser (null = pas de synchro)
 * @param timeBudgetMs       arrête de traiter de nouveaux matchs au-delà (CRON Vercel)
 */
export async function runGamePipeline(
  prisma: PrismaClient,
  opts: {
    season?:       string;
    syncFrom?:     string | null;
    syncTo?:       string | null;
    timeBudgetMs?: number;
    maxGames?:     number;
    log?:          Logger;
  } = {}
): Promise<PipelineResult> {
  const start  = Date.now();
  const season = opts.season ?? getCurrentSeason();
  const log    = opts.log ?? (() => {});
  const budget = opts.timeBudgetMs ?? Infinity;

  // ── Calendrier ─────────────────────────────────────────────
  let schedule: ScheduleSyncResult | null = null;
  if (opts.syncFrom && opts.syncTo) {
    log(`📅 Calendrier ${opts.syncFrom} → ${opts.syncTo}`);
    schedule = await syncSchedule(prisma, opts.syncFrom, opts.syncTo, { log });
    log(`   ${schedule.created} créé(s), ${schedule.updated} mis à jour, ${schedule.skipped.unknownTeam} TBD/hors NBA ignoré(s)`);
    for (const e of schedule.errors) log(`   ⚠️  ${e}`);
  }

  // ── Groupes NBA Cup (une requête quand ils sont déjà attribués) ──
  try {
    await ensureNbaCupGroups(prisma, season, log);
  } catch (err) {
    log(`  ⚠️  Groupes NBA Cup : ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Matchs terminés ─────────────────────────────────────────
  const todo = await findUnprocessedFinalGames(prisma, season, opts.maxGames);
  if (todo.length > 0) log(`🎯 ${todo.length} match(s) terminé(s) à traiter`);
  else log(`🎯 Aucun nouveau match terminé : box scores, pronos, moyennes et classement déjà à jour`);

  const processed: ProcessedGame[] = [];
  const teamsToRecalc = new Set<string>();
  const playoffGameIds: string[] = [];

  for (const { id } of todo) {
    if (Date.now() - start > budget) break;
    const r = await processFinalGame(prisma, id, { season, log });
    if (!r) continue;
    processed.push(r);
    if (r.deferred) continue;

    const g = await prisma.game.findUnique({
      where:  { id },
      select: { homeTeamId: true, awayTeamId: true, seasonType: true, seriesId: true },
    });
    if (!g) continue;
    if (g.seasonType === "Regular Season") {
      teamsToRecalc.add(g.homeTeamId);
      teamsToRecalc.add(g.awayTeamId);
    }
    if (g.seasonType === "Playoffs" && g.seriesId) playoffGameIds.push(id);
  }

  // ── Classement ──────────────────────────────────────────────
  for (const teamId of teamsToRecalc) {
    try {
      await calculateStandings(teamId, season);
    } catch (err) {
      log(`  ⚠️  Classement ${teamId} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (teamsToRecalc.size > 0) {
    log(`📊 Classement recalculé pour ${teamsToRecalc.size} équipe(s)`);
    // Rangs en conférence / division (fiche équipe) : dépendent de toutes les équipes
    try {
      await updateStandingRanks(season);
    } catch (err) {
      log(`  ⚠️  Rangs du classement : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Séries playoffs ─────────────────────────────────────────
  let completed = 0;
  let ifNecessaryCancelled = 0;
  const done = new Set<string>();
  for (const gameId of playoffGameIds) {
    try {
      const seriesId = await updateSeriesAfterGame(gameId, prisma);
      if (seriesId && !done.has(seriesId)) {
        done.add(seriesId);
        completed++;
        ifNecessaryCancelled += await cancelIfNecessaryGames(seriesId, prisma);
      }
    } catch (err) {
      log(`  ⚠️  Série playoffs (match ${gameId}) : ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (completed > 0) log(`🏆 ${completed} série(s) terminée(s), ${ifNecessaryCancelled} match(s) if-necessary annulé(s)`);

  const remaining = (await findUnprocessedFinalGames(prisma, season)).length;

  return {
    season,
    schedule,
    processed,
    remaining,
    standings: teamsToRecalc.size,
    series: { completed, ifNecessaryCancelled },
    durationMs: Date.now() - start,
  };
}

/** Fenêtre glissante par défaut du CRON : J-3 → J+7 (dates US Eastern). */
export function defaultSyncWindow(now: Date = new Date(), back = 3, ahead = 7) {
  const today = toEasternDateString(now);
  return { from: shiftDate(today, -back), to: shiftDate(today, ahead), today };
}
