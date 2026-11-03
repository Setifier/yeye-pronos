/**
 * Synchronisation du calendrier NBA (ESPN scoreboard → table Game)
 *
 * Source unique utilisée par :
 *   - prisma/seed-espn.ts          (saison complète)
 *   - prisma/run-update.ts         (mise à jour manuelle)
 *   - /api/cron/morning-update     (fenêtre glissante J-3 → J+7)
 *   - /api/cron/update-live-scores (jour en cours)
 *
 * Règles :
 *   - On n'importe que les types ESPN 2 (régulière), 3 (playoffs), 5 (play-in).
 *     La présaison (type 1) et les matchs d'exhibition (équipes hors NBA) sont ignorés.
 *   - Les matchs NBA Cup dont les équipes sont encore "TBD" sont ignorés :
 *     ils seront créés automatiquement dès qu'ESPN connaîtra les équipes.
 *   - Un match if-necessary annulé par nos soins (série terminée) reste CANCELLED.
 *   - Un match FINAL ne repasse jamais en SCHEDULED/LIVE.
 *   - Un report (POSTPONED) annule les pronos en attente.
 *   - Les dates : gameDate = UTC exact, localGameDate = heure locale de l'équipe à domicile
 *     (stockée en "fake UTC"), regroupement par jour = date US Eastern (convention NBA).
 */

import type { PrismaClient } from "@/generated/prisma";
import {
  getGamesByDate,
  parseESPNGame,
  normalizeEspnAbbr,
  toEspnDate,
  dateRangeInclusive,
} from "@/lib/espn";
import { getTeamTimezone } from "@/lib/nba-timezones";
import {
  isTrackedESPNSeasonType,
  mapESPNSeasonType,
  seasonFromESPNYear,
} from "@/types/season";
import { getOrCreateSeries } from "@/lib/playoff-series";
import { predictionDeadlineFor } from "@/types/bet";

// Les pronos ferment au coup d'envoi : règle centralisée dans src/types/bet.ts
export { PREDICTION_DEADLINE_MINUTES } from "@/types/bet";

type GameStatus = "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED";

type Logger = (msg: string) => void;

export interface ScheduleSyncResult {
  dates:     number;
  espnGames: number;
  created:   number;
  updated:   number;
  skipped:   { preseason: number; unknownTeam: number };
  postponedPredictionsCancelled: number;
  errors:    string[];
}

function emptyResult(): ScheduleSyncResult {
  return {
    dates: 0,
    espnGames: 0,
    created: 0,
    updated: 0,
    skipped: { preseason: 0, unknownTeam: 0 },
    postponedPredictionsCancelled: 0,
    errors: [],
  };
}

/**
 * Convertit une date UTC en "fake UTC" portant les chiffres de l'heure locale d'un fuseau.
 * Ex : 2026-10-23T23:30Z à New York → 2026-10-23T19:30Z
 */
export function convertToLocalDate(utcDate: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcDate);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  );
}

/** Map abréviation DB → id équipe. */
export async function loadTeamsByAbbr(prisma: PrismaClient): Promise<Map<string, string>> {
  const teams = await prisma.team.findMany({ select: { id: true, abbreviation: true } });
  return new Map(teams.map((t) => [t.abbreviation, t.id]));
}

/**
 * Synchronise les matchs d'une date US Eastern (YYYY-MM-DD).
 */
export async function syncGamesForDate(
  prisma: PrismaClient,
  isoDate: string,
  teamsByAbbr: Map<string, string>,
  log: Logger = () => {}
): Promise<ScheduleSyncResult> {
  const result = emptyResult();
  result.dates = 1;

  let events;
  try {
    events = (await getGamesByDate(toEspnDate(isoDate))).events ?? [];
  } catch (err) {
    result.errors.push(`${isoDate}: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.espnGames = events.length;
  if (events.length === 0) return result;

  const touchedSeries = new Set<string>();

  // État actuel en DB des matchs de cette date (une seule requête)
  const existing = await prisma.game.findMany({
    where: { externalId: { in: events.map((e) => e.id) } },
    select: {
      id: true,
      externalId: true,
      status: true,
      isIfNecessary: true,
      homeTeamId: true,
      awayTeamId: true,
      _count: { select: { predictions: true } },
    },
  });
  const existingById = new Map(existing.map((g) => [g.externalId, g]));

  for (const event of events) {
    try {
      if (!isTrackedESPNSeasonType(event.season.type)) {
        result.skipped.preseason++;
        continue;
      }

      const parsed   = parseESPNGame(event);
      const homeAbbr = normalizeEspnAbbr(parsed.homeTeam.abbreviation);
      const awayAbbr = normalizeEspnAbbr(parsed.awayTeam.abbreviation);
      const homeTeamId = teamsByAbbr.get(homeAbbr);
      const awayTeamId = teamsByAbbr.get(awayAbbr);

      if (!homeTeamId || !awayTeamId) {
        // "TBD" (NBA Cup à élimination directe pas encore connue) ou équipe hors NBA
        result.skipped.unknownTeam++;
        continue;
      }

      const season     = seasonFromESPNYear(parsed.seasonYear);
      const seasonType = mapESPNSeasonType(parsed.seasonTypeId);
      const localGameDate = convertToLocalDate(parsed.date, getTeamTimezone(homeAbbr));
      const predictionDeadline = predictionDeadlineFor(parsed.date);

      const prev = existingById.get(parsed.externalId);

      // ── Statut : protections contre les régressions ──
      // Un match FINAL en DB n'est plus touché si ESPN renvoie autre chose (données incohérentes)
      if (prev?.status === "FINAL" && parsed.status !== "FINAL") continue;

      let status: GameStatus = parsed.status;
      if (prev?.status === "CANCELLED" && prev.isIfNecessary && status === "SCHEDULED") {
        status = "CANCELLED";
      }

      const isFinal = status === "FINAL" && parsed.homeScore !== null && parsed.awayScore !== null;
      const winnerId = isFinal
        ? (parsed.homeScore! > parsed.awayScore! ? homeTeamId : awayTeamId)
        : null;

      // ── Série playoffs ──
      let seriesId: string | null = null;
      if (seasonType === "Playoffs") {
        seriesId = await getOrCreateSeries(
          prisma, season, homeTeamId, awayTeamId, homeAbbr, awayAbbr,
          parsed.round ?? null, parsed.conference ?? null
        );
        touchedSeries.add(seriesId);
      }

      // Tour NBA Cup : uniquement en saison régulière (la note "Semifinals" existe aussi en playoffs)
      const nbaCupRound = seasonType === "Regular Season" ? parsed.nbaCupRound : null;

      const common = {
        season,
        seasonType,
        gameDate:      parsed.date,
        localGameDate,
        status,
        homeScore:     parsed.homeScore,
        awayScore:     parsed.awayScore,
        currentPeriod: parsed.currentPeriod,
        gameClock:     parsed.gameClock,
        winnerId,
        isIfNecessary: parsed.isIfNecessary,
        predictionDeadline,
        ...(seriesId ? { seriesId } : {}),
        ...(nbaCupRound ? { nbaCupRound } : {}),
      };

      if (prev) {
        // On ne change les équipes que si personne n'a encore parié sur ce match
        const teamsChanged = prev.homeTeamId !== homeTeamId || prev.awayTeamId !== awayTeamId;
        const teamUpdate = teamsChanged && prev._count.predictions === 0
          ? { homeTeamId, awayTeamId }
          : {};
        if (teamsChanged && prev._count.predictions > 0) {
          result.errors.push(`${parsed.externalId}: équipes modifiées par ESPN mais pronos existants — non modifié`);
        }

        await prisma.game.update({
          where: { id: prev.id },
          data:  { ...common, ...teamUpdate },
        });
        result.updated++;

        if (status === "POSTPONED" && prev.status !== "POSTPONED") {
          const cancelled = await prisma.prediction.updateMany({
            where: { gameId: prev.id, result: "PENDING" },
            data:  { result: "CANCELLED", pointsEarned: 0 },
          });
          result.postponedPredictionsCancelled += cancelled.count;
          log(`  ⏸️  ${awayAbbr} @ ${homeAbbr} reporté — ${cancelled.count} prono(s) annulé(s)`);
        }
      } else {
        await prisma.game.create({
          data: {
            externalId: parsed.externalId,
            homeTeamId,
            awayTeamId,
            ...common,
          },
        });
        result.created++;
        log(`  ✅ ${isoDate} ${awayAbbr} @ ${homeAbbr}${nbaCupRound ? ` [NBA Cup ${nbaCupRound}]` : ""}`);
      }
    } catch (err) {
      result.errors.push(`${event.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (touchedSeries.size > 0) await renumberSeriesGames(prisma, [...touchedSeries]);

  return result;
}

/**
 * Numérote les matchs d'une série playoffs (Game 1, 2, 3…) par ordre chronologique,
 * en ignorant les matchs if-necessary annulés.
 */
export async function renumberSeriesGames(prisma: PrismaClient, seriesIds: string[]): Promise<void> {
  for (const seriesId of seriesIds) {
    const games = await prisma.game.findMany({
      where:   { seriesId, status: { not: "CANCELLED" } },
      orderBy: { gameDate: "asc" },
      select:  { id: true, gameNumber: true },
    });
    for (const [i, g] of games.entries()) {
      if (g.gameNumber !== i + 1) {
        await prisma.game.update({ where: { id: g.id }, data: { gameNumber: i + 1 } });
      }
    }
  }
}

/**
 * Synchronise une plage de dates US Eastern (YYYY-MM-DD, bornes incluses).
 */
export async function syncSchedule(
  prisma: PrismaClient,
  from: string,
  to: string,
  opts: { delayMs?: number; log?: Logger; onDate?: (date: string, r: ScheduleSyncResult) => void } = {}
): Promise<ScheduleSyncResult> {
  const { delayMs = 0, log = () => {}, onDate } = opts;
  const teamsByAbbr = await loadTeamsByAbbr(prisma);
  const total = emptyResult();

  for (const date of dateRangeInclusive(from, to)) {
    const r = await syncGamesForDate(prisma, date, teamsByAbbr, log);
    total.dates += r.dates;
    total.espnGames += r.espnGames;
    total.created += r.created;
    total.updated += r.updated;
    total.skipped.preseason += r.skipped.preseason;
    total.skipped.unknownTeam += r.skipped.unknownTeam;
    total.postponedPredictionsCancelled += r.postponedPredictionsCancelled;
    total.errors.push(...r.errors);
    onDate?.(date, r);
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
  }

  return total;
}
