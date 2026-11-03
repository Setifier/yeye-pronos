/**
 * Script : Backfill complet Play-In + Playoffs
 *
 * Phase 1 — Sync des matchs depuis ESPN (upsert games + séries)
 * Phase 2 — Boxscores, stats joueurs, résultats pronos
 * Phase 3 — Recalcul wins séries + fix seeds Play-In
 *
 * Usage :
 *   npm run db:backfill-postseason
 *   npm run db:backfill-postseason -- --from=2026-04-15   (défaut: début du Play-In)
 *   npm run db:backfill-postseason -- --from=2026-04-19   (playoffs uniquement)
 *   npm run db:backfill-postseason -- --dry-run           (phase 1 seulement, pas de boxscores)
 */

import { prisma } from "../src/lib/prisma";
import { getGamesByDate, parseESPNGame } from "../src/lib/espn";
import { predictionDeadlineFor } from "../src/types/bet";
import { getTeamTimezone } from "../src/lib/nba-timezones";
import { mapESPNSeasonType, getCurrentSeason } from "../src/types/season";
import { fetchAndSaveGameStats } from "../src/lib/espn-stats";
import { recalculatePlayerStatsForGame } from "../src/lib/calculate-player-season-stats";
import {
  getOrCreateSeries,
  updateSeriesAfterGame,
  cancelIfNecessaryGames,
} from "../src/lib/playoff-series";
import {
  getScoreMarginCategory,
  calculateTotalPoints,
  ScoreMarginCategory,
} from "../src/types/bonus";

// ─── Config ───────────────────────────────────────────────────────────────────

// Play-In 2026 starts April 15
const PLAYIN_START = "2026-04-15";
const SEASON_END   = "2026-06-15";
const DELAY_MS     = 700;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESPN_TO_NBA: Record<string, string> = {
  WSH: "WAS", NY: "NYK", SA: "SAS", NO: "NOP", GS: "GSW", UTAH: "UTA",
};
const normalizeAbbr = (a: string) => ESPN_TO_NBA[a] ?? a;

function seasonFromYear(y: number) {
  return `${y - 1}-${String(y).slice(-2)}`;
}

function toLocalDate(utcDate: Date, tz: string): Date {
  const s = utcDate.toLocaleString("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const [datePart, timePart] = s.split(", ");
  const [m, d, y] = datePart.split("/");
  const [hh, mm, ss] = timePart.split(":");
  return new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10).replace(/-/g, ""));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Phase 1 : Sync ESPN ──────────────────────────────────────────────────────

async function syncGames(from: string, to: string, teamsByAbbr: Map<string, string>) {
  console.log(`\n📡 Phase 1 — Sync ESPN  (${from} → ${to})\n`);

  const dates = dateRange(from, to);
  let upserted = 0;

  for (const date of dates) {
    try {
      const response = await getGamesByDate(date);
      const events   = response.events ?? [];

      if (events.length === 0) { process.stdout.write("."); continue; }

      for (const espnGame of events) {
        const parsed    = parseESPNGame(espnGame);
        const homeAbbr  = normalizeAbbr(parsed.homeTeam.abbreviation);
        const awayAbbr  = normalizeAbbr(parsed.awayTeam.abbreviation);
        const homeTeamId = teamsByAbbr.get(homeAbbr);
        const awayTeamId = teamsByAbbr.get(awayAbbr);

        if (!homeTeamId || !awayTeamId) {
          console.warn(`  ⚠️  Team not found: ${awayAbbr} @ ${homeAbbr}`);
          continue;
        }

        const season       = seasonFromYear(espnGame.season.year);
        const seasonType   = mapESPNSeasonType(espnGame.season.type);
        const localDate    = toLocalDate(parsed.date, getTeamTimezone(homeAbbr));
        const deadline     = predictionDeadlineFor(parsed.date); // clôture au coup d'envoi

        let winnerId: string | null = null;
        if (parsed.status === "FINAL" && parsed.homeScore !== null && parsed.awayScore !== null) {
          winnerId = parsed.homeScore > parsed.awayScore ? homeTeamId : awayTeamId;
        }

        let seriesId: string | null = null;
        if (seasonType === "Playoffs") {
          try {
            seriesId = await getOrCreateSeries(
              prisma, season, homeTeamId, awayTeamId,
              homeAbbr, awayAbbr, parsed.round ?? null, parsed.conference ?? null
            );
          } catch (e) {
            console.warn(`  ⚠️  Series error ${awayAbbr}@${homeAbbr}:`, e);
          }
        }

        await prisma.game.upsert({
          where:  { externalId: parsed.externalId },
          update: {
            gameDate: parsed.date, localGameDate: localDate,
            status: parsed.status, homeScore: parsed.homeScore, awayScore: parsed.awayScore,
            winnerId, season, seasonType, isIfNecessary: parsed.isIfNecessary,
            seriesId, predictionDeadline: deadline, updatedAt: new Date(),
          },
          create: {
            externalId: parsed.externalId, season, seasonType,
            gameDate: parsed.date, localGameDate: localDate,
            status: parsed.status, homeTeamId, awayTeamId,
            homeScore: parsed.homeScore, awayScore: parsed.awayScore,
            winnerId, isIfNecessary: parsed.isIfNecessary,
            seriesId, predictionDeadline: deadline,
          },
        });
        upserted++;
      }
      console.log(`  ✅ ${date} — ${events.length} matchs`);
    } catch (e) {
      console.error(`  ❌ ${date}:`, e);
    }
    await sleep(400);
  }

  console.log(`\n✅ Phase 1 terminée — ${upserted} matchs upsertés`);
}

// ─── Phase 2 : Boxscores + pronos + stats joueurs ────────────────────────────

async function processBoxscores(season: string) {
  console.log(`\n🎯 Phase 2 — Boxscores + pronos + stats joueurs\n`);

  const games = await prisma.game.findMany({
    where: {
      season,
      status:     "FINAL",
      seasonType: { in: ["Playoffs", "Play-In Tournament"] },
      topScorerId: null, // pas encore traité
    },
    include: {
      predictions: {
        include: {
          predictedTopScorer: {
            include: { seasonStats: { where: { season }, take: 1 } },
          },
        },
      },
    },
    orderBy: { gameDate: "asc" },
  });

  console.log(`🔍 ${games.length} matchs FINAL sans boxscore\n`);
  if (games.length === 0) { console.log("  Rien à faire."); return; }

  let processed = 0;
  let errors    = 0;

  for (const game of games) {
    const idx = `[${processed + 1}/${games.length}]`;
    console.log(`\n${idx} ${game.externalId} (${game.seasonType})`);

    // 2a. Boxscore
    let topScorer: { playerId: string; points: number } | null = null;
    try {
      topScorer = await fetchAndSaveGameStats(game.externalId, game.id);
    } catch (e) {
      console.error(`  ❌ Boxscore:`, e);
      errors++;
      await sleep(DELAY_MS);
      continue;
    }

    // 2b. Score margin + overtime → update game
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    const hasOvertime = (game.currentPeriod ?? 0) > 4;
    const scoreMarginCategory = getScoreMarginCategory(homeScore, awayScore, hasOvertime);

    await prisma.game.update({
      where: { id: game.id },
      data: {
        topScorerId:         topScorer?.playerId ?? null,
        topScorerPoints:     topScorer?.points   ?? null,
        actualScoreMargin:   Math.abs(homeScore - awayScore),
        scoreMarginCategory,
        hasOvertime,
      },
    });
    console.log(`  ✅ Top scorer: ${topScorer ? `${topScorer.points} pts` : "n/a"} | Margin: ${scoreMarginCategory}`);

    // 2c. Pronos PENDING
    const pending = game.predictions.filter((p) => p.result === "PENDING");
    if (pending.length > 0) {
      const winnerId = homeScore > awayScore ? game.homeTeamId : game.awayTeamId;

      for (const pred of pending) {
        const didWin = pred.predictedTeamId === winnerId;
        const avgPts = pred.predictedTopScorer?.seasonStats?.[0]?.pointsPerGame ?? 0;

        const bonusResult = calculateTotalPoints({
          predictionWon:              didWin,
          predictedMargin:            pred.predictedScoreMargin as ScoreMarginCategory | null,
          actualMargin:               scoreMarginCategory,
          predictedTopScorerId:       pred.predictedTopScorerId,
          actualTopScorerId:          topScorer?.playerId ?? null,
          predictedTopScorerAverage:  avgPts,
        });

        await prisma.prediction.update({
          where: { id: pred.id },
          data: {
            result:               didWin ? "WON" : "LOST",
            pointsEarned:         bonusResult.total,
            marginBonusPoints:    bonusResult.marginBonus,
            topScorerBonusPoints: bonusResult.topScorerBonus,
            comboBonusPoints:     bonusResult.comboBonus,
          },
        });
      }
      console.log(`  🎯 ${pending.length} prono(s) calculé(s)`);
    }

    // 2d. Stats joueurs
    try {
      const n = await recalculatePlayerStatsForGame(game.id, prisma);
      console.log(`  📊 ${n} joueurs mis à jour`);
    } catch (e) {
      console.warn(`  ⚠️  Player stats:`, e);
    }

    processed++;
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Phase 2 terminée — ${processed} traités, ${errors} erreur(s)`);
}

// ─── Phase 3 : Wins séries + seeds ───────────────────────────────────────────

async function updateSeries(season: string) {
  console.log(`\n🔢 Phase 3 — Recalcul wins séries + seeds\n`);

  // Recount wins pour toutes les séries actives
  const finalGames = await prisma.game.findMany({
    where: {
      season,
      status:     "FINAL",
      seasonType: "Playoffs",
      seriesId:   { not: null },
    },
    select: { id: true },
  });

  const completedSeriesIds = new Set<string>();
  for (const g of finalGames) {
    const completedId = await updateSeriesAfterGame(g.id, prisma);
    if (completedId) completedSeriesIds.add(completedId);
  }

  // Annuler les matchs if-necessary des séries terminées
  let cancelled = 0;
  for (const sid of completedSeriesIds) {
    cancelled += await cancelIfNecessaryGames(sid, prisma);
  }

  console.log(`  ✅ ${completedSeriesIds.size} série(s) recalculée(s), ${cancelled} match(s) if-necessary annulé(s)`);

  // Fix seeds (matchup-inference)
  const r1 = await prisma.playoffSeries.findMany({
    where: { season, round: 1 },
    include: {
      team1: { select: { id: true, abbreviation: true, conference: true } },
      team2: { select: { id: true, abbreviation: true, conference: true } },
    },
  });

  if (r1.length > 0) {
    const teamIds = r1.flatMap((s) => [s.team1Id, s.team2Id]);
    const stats = await prisma.teamSeasonStats.findMany({
      where: { season, teamId: { in: teamIds } },
      select: { teamId: true, winPct: true, conferenceRecord: true },
    });
    const statsMap = new Map(stats.map((s) => [s.teamId, s]));

    const byConf: Record<string, typeof r1> = {};
    for (const s of r1) {
      const c = s.conference ?? s.team1.conference ?? "?";
      (byConf[c] ??= []).push(s);
    }

    for (const [, seriesList] of Object.entries(byConf)) {
      const allTeams = [...new Set(seriesList.flatMap((s) => [s.team1Id, s.team2Id]))];
      const sorted = allTeams
        .map((id) => ({ id, st: statsMap.get(id) }))
        .sort((a, b) => {
          const diff = (b.st?.winPct ?? 0) - (a.st?.winPct ?? 0);
          if (Math.abs(diff) > 1e-6) return diff;
          const parseConf = (r: string | null | undefined) =>
            parseInt((r ?? "0-0").split("-")[0] ?? "0", 10) || 0;
          return parseConf(b.st?.conferenceRecord) - parseConf(a.st?.conferenceRecord);
        });

      const baseSeed: Record<string, number> = {};
      sorted.slice(0, 4).forEach((t, i) => { baseSeed[t.id] = i + 1; });

      const partner: Record<string, string> = {};
      for (const s of seriesList) { partner[s.team1Id] = s.team2Id; partner[s.team2Id] = s.team1Id; }

      const complement: Record<number, number> = { 1: 8, 2: 7, 3: 6, 4: 5 };
      const seedMap: Record<string, number> = { ...baseSeed };
      for (const [id, seed] of Object.entries(baseSeed)) {
        const pid = partner[id];
        if (pid) seedMap[pid] = complement[seed]!;
      }

      for (const s of seriesList) {
        const s1 = seedMap[s.team1Id] ?? null;
        const s2 = seedMap[s.team2Id] ?? null;
        if (s.team1Seed !== s1 || s.team2Seed !== s2) {
          await prisma.playoffSeries.update({
            where: { id: s.id },
            data:  { team1Seed: s1, team2Seed: s2 },
          });
        }
      }
    }
    console.log(`  🌱 Seeds playoff mis à jour`);
  }

  // ── Fix null round/conference for series where ESPN didn't provide it ───────
  // Strategy: a team in its Nth distinct playoff series is in round N.
  // Cross-conference pair = Finals (round 4).
  const nullSeries = await prisma.playoffSeries.findMany({
    where: { season, round: null },
    include: {
      team1: { select: { id: true, abbreviation: true, conference: true } },
      team2: { select: { id: true, abbreviation: true, conference: true } },
    },
  });

  if (nullSeries.length > 0) {
    // Build map: teamId → how many KNOWN playoff series (round != null) they've played
    const knownSeries = await prisma.playoffSeries.findMany({
      where: { season, round: { not: null } },
      select: { team1Id: true, team2Id: true, round: true, conference: true },
    });

    const teamSeriesCount = new Map<string, number>();
    for (const s of knownSeries) {
      teamSeriesCount.set(s.team1Id, (teamSeriesCount.get(s.team1Id) ?? 0) + 1);
      teamSeriesCount.set(s.team2Id, (teamSeriesCount.get(s.team2Id) ?? 0) + 1);
    }

    let roundsFixed = 0;
    for (const s of nullSeries) {
      const sameConf = s.team1.conference === s.team2.conference;

      let newRound: number | null = null;
      let newConference: string | null = null;

      if (!sameConf) {
        newRound = 4;
        newConference = "Finals";
      } else {
        // Round = max prior series of either team + 1
        const priorMax = Math.max(
          teamSeriesCount.get(s.team1Id) ?? 0,
          teamSeriesCount.get(s.team2Id) ?? 0
        );
        newRound = priorMax + 1;
        newConference = s.team1.conference === "EAST" ? "East" : "West";
      }

      if (newRound && newConference) {
        await prisma.playoffSeries.update({
          where: { id: s.id },
          data:  { round: newRound, conference: newConference },
        });
        roundsFixed++;
        // Update the count for next iterations
        teamSeriesCount.set(s.team1Id, (teamSeriesCount.get(s.team1Id) ?? 0) + 1);
        teamSeriesCount.set(s.team2Id, (teamSeriesCount.get(s.team2Id) ?? 0) + 1);
      }
    }
    if (roundsFixed > 0) console.log(`  🔄 ${roundsFixed} série(s) avec round null corrigé(es)`);
  }

  // ── Assign gameNumber to all playoff games in each series ─────────────────
  const allSeries = await prisma.playoffSeries.findMany({
    where: { season },
    select: { id: true },
  });

  let numbersFixed = 0;
  for (const series of allSeries) {
    const games = await prisma.game.findMany({
      where:   { seriesId: series.id, status: { not: "CANCELLED" } },
      orderBy: { gameDate: "asc" },
      select:  { id: true, gameNumber: true },
    });
    for (let i = 0; i < games.length; i++) {
      const expected = i + 1;
      if (games[i].gameNumber !== expected) {
        await prisma.game.update({ where: { id: games[i].id }, data: { gameNumber: expected } });
        numbersFixed++;
      }
    }
  }
  console.log(`  🔢 ${numbersFixed} game number(s) mis à jour`);

  console.log(`\n✅ Phase 3 terminée`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2);
  const from   = args.find((a) => a.startsWith("--from="))?.split("=")[1] ?? PLAYIN_START;
  const to     = args.find((a) => a.startsWith("--to="))?.split("=")[1]   ?? SEASON_END;
  const dryRun = args.includes("--dry-run");
  const season = getCurrentSeason();

  console.log(`\n🏀 Backfill Postseason — ${season}`);
  console.log(`📅 Période : ${from} → ${to}${dryRun ? "  [DRY RUN — phase 1 seulement]" : ""}`);
  console.log("=".repeat(60));

  // Charger les équipes
  const teams = await prisma.team.findMany({ select: { id: true, abbreviation: true } });
  const teamsByAbbr = new Map(teams.map((t) => [t.abbreviation, t.id]));
  console.log(`\n✅ ${teams.length} équipes chargées`);

  // Phase 1 — toujours
  await syncGames(from, to, teamsByAbbr);

  if (!dryRun) {
    // Phase 2
    await processBoxscores(season);
    // Phase 3
    await updateSeries(season);
  }

  console.log(`\n🎉 Backfill postseason terminé !\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("\n❌ Erreur fatale:", e); process.exit(1); });
