/**
 * Notation des paris de début de saison (barèmes : src/types/special-predictions.ts).
 *
 * Progressive et idempotente : à chaque passage, les points de chaque pari sont recalculés à partir
 * des résultats connus. Un pari passe en GRADED quand tous ses résultats sont connus, sinon LOCKED.
 *
 *   NBA Cup     finale de la NBA Cup (match "Championship" terminé)         → décembre
 *   Classement  rangs finaux de conférence (TeamSeasonStats.conferenceRank)  → fin de saison régulière
 *   Bracket     Play-in (1er tour connu), séries de playoffs tour par tour   → avril à juin
 *   Trophées    vainqueurs saisis dans l'admin (/admin/saison)               → avril à juin
 *
 * Lancée chaque matin par le CRON (après les matchs) et par le bouton de l'admin.
 */

import type { Prisma, PrismaClient } from "@/generated/prisma";
import {
  AWARD_KEYS,
  AWARD_LABELS,
  PRESEASON_BET_TYPES,
  PRESEASON_BRACKET_POINTS as B,
  STANDINGS_POINTS,
  type AwardKey,
  type PlayerAwardType,
  type PreseasonBracketData,
  type SeriesPrediction,
  type StandingsPredictionData,
} from "@/types/special-predictions";
import { getNbaCupOdds, getPreseasonDeadline, loadSeasonTeams } from "@/lib/special-bets";
import { awardPoints, getAwardBoards, type AwardBoards } from "@/lib/award-odds";
import { stableStringify } from "@/lib/preseason-bracket";

// ─── Résultats ────────────────────────────────────────────────────────────────

const AWARD_OF: Record<PlayerAwardType, AwardKey> = {
  PRESEASON_MVP_SEASON: "MVP",
  PRESEASON_DPOY:       "DPOY",
  PRESEASON_ROOKIE:     "ROOKIE",
};

type Conf = "east" | "west";
type Round = 1 | 2 | 3 | 4;
const ROUNDS: Round[] = [1, 2, 3, 4];
const EXPECTED_SERIES: Record<Round, number> = { 1: 8, 2: 4, 3: 2, 4: 1 };

interface ActualSeries { teams: [string, string]; winnerId: string | null; games: number }

export interface SeasonResults {
  nbaCupChampion: string | null;
  /** Classement final (ids du 1er au 15e), connu quand toute la saison régulière est jouée. */
  standings: Record<Conf, string[]> | null;
  /** Équipes qualifiées en 7e ou 8e place, connues dès que le 1er tour de la conférence est formé. */
  playin: Record<Conf, Set<string> | null>;
  rounds: Record<Round, { series: ActualSeries[]; complete: boolean }>;
  awards: Partial<Record<AwardKey, string>>;
}

export async function loadSeasonResults(prisma: PrismaClient, season: string): Promise<SeasonResults> {
  const [cupFinal, regular, stats, teams, series, awards] = await Promise.all([
    prisma.game.findFirst({
      where:  { season, nbaCupRound: "Championship", status: "FINAL" },
      select: { winnerId: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    }),
    prisma.game.groupBy({ by: ["status"], where: { season, seasonType: "Regular Season" }, _count: { _all: true } }),
    prisma.teamSeasonStats.findMany({ where: { season }, select: { teamId: true, conferenceRank: true } }),
    prisma.team.findMany({ select: { id: true, conference: true } }),
    prisma.playoffSeries.findMany({
      where:  { season },
      select: { round: true, team1Id: true, team2Id: true, team1Wins: true, team2Wins: true, winnerId: true, status: true },
    }),
    prisma.seasonAwardResult.findMany({ where: { season }, select: { award: true, playerId: true } }).catch(() => []),
  ]);

  // NBA Cup
  let nbaCupChampion: string | null = null;
  if (cupFinal) {
    nbaCupChampion = cupFinal.winnerId
      ?? (cupFinal.homeScore != null && cupFinal.awayScore != null && cupFinal.homeScore !== cupFinal.awayScore
        ? (cupFinal.homeScore > cupFinal.awayScore ? cupFinal.homeTeamId : cupFinal.awayTeamId)
        : null);
  }

  // Classement final : toute la saison régulière jouée, 15 rangs par conférence
  const total = regular.reduce((s, g) => s + g._count._all, 0);
  const done = regular.filter((g) => ["FINAL", "CANCELLED", "POSTPONED"].includes(g.status)).reduce((s, g) => s + g._count._all, 0);
  const confOf = new Map(teams.map((t) => [t.id, t.conference === "EAST" ? "east" : "west"] as const));
  let standings: SeasonResults["standings"] = null;
  if (total > 0 && done === total) {
    const lists: Record<Conf, { id: string; rank: number }[]> = { east: [], west: [] };
    for (const s of stats) {
      const conf = confOf.get(s.teamId);
      if (conf && s.conferenceRank) lists[conf].push({ id: s.teamId, rank: s.conferenceRank });
    }
    if (lists.east.length === 15 && lists.west.length === 15) {
      const order = (l: { id: string; rank: number }[]) => l.sort((a, b) => a.rank - b.rank).map((x) => x.id);
      standings = { east: order(lists.east), west: order(lists.west) };
    }
  }

  // Séries de playoffs, par tour
  const rounds = {} as SeasonResults["rounds"];
  for (const r of ROUNDS) {
    const list = series
      .filter((s) => s.round === r)
      .map((s): ActualSeries => ({
        teams:    [s.team1Id, s.team2Id],
        winnerId: s.status === "COMPLETED" ? s.winnerId : null,
        games:    s.team1Wins + s.team2Wins,
      }));
    rounds[r] = { series: list, complete: list.length === EXPECTED_SERIES[r] && list.every((s) => s.winnerId) };
  }

  // Play-in : équipes du 1er tour classées 7e ou plus loin en saison régulière
  const playin: SeasonResults["playin"] = { east: null, west: null };
  if (standings) {
    for (const conf of ["east", "west"] as const) {
      const r1 = rounds[1].series.filter((s) => confOf.get(s.teams[0]) === conf);
      if (r1.length !== 4) continue;
      const top6 = new Set(standings[conf].slice(0, 6));
      playin[conf] = new Set(r1.flatMap((s) => s.teams).filter((id) => !top6.has(id)));
    }
  }

  const awardMap: SeasonResults["awards"] = {};
  for (const a of awards) if ((AWARD_KEYS as readonly string[]).includes(a.award)) awardMap[a.award as AwardKey] = a.playerId;

  return { nbaCupChampion, standings, playin, rounds, awards: awardMap };
}

// ─── Barèmes appliqués ────────────────────────────────────────────────────────

export interface GradeLine { label: string; points: number }
export interface Grade { points: number; final: boolean; lines: GradeLine[] }

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function gradeNbaCup(data: { teamId?: string }, results: SeasonResults, odds: Map<string, number>): Grade {
  if (!results.nbaCupChampion) return { points: 0, final: false, lines: [] };
  if (data.teamId !== results.nbaCupChampion) return { points: 0, final: true, lines: [] };
  const points = odds.get(data.teamId) ?? 0;
  return { points, final: true, lines: [{ label: "Champion NBA Cup trouvé", points }] };
}

function gradeAward(type: PlayerAwardType, data: { playerId?: string }, results: SeasonResults, boards: AwardBoards): Grade {
  const winner = results.awards[AWARD_OF[type]];
  if (!winner) return { points: 0, final: false, lines: [] };
  if (!data.playerId || data.playerId !== winner) return { points: 0, final: true, lines: [] };
  const points = awardPoints(boards, type, data.playerId) ?? 0;
  return { points, final: true, lines: [{ label: `${AWARD_LABELS[AWARD_OF[type]]} trouvé`, points }] };
}

function gradeStandings(data: StandingsPredictionData, results: SeasonResults): Grade {
  const actual = results.standings;
  if (!actual) return { points: 0, final: false, lines: [] };

  let exact = 0;
  let near = 0;
  for (const conf of ["east", "west"] as const) {
    const rankOf = new Map(actual[conf].map((id, i) => [id, i]));
    (data[conf] ?? []).forEach((id, i) => {
      const r = rankOf.get(id);
      if (r == null) return;
      if (r === i) exact++;
      else if (Math.abs(r - i) === 1) near++;
    });
  }

  const lines: GradeLine[] = [];
  if (exact) lines.push({ label: plural(exact, "place exacte", "places exactes"), points: exact * STANDINGS_POINTS.EXACT });
  if (near)  lines.push({ label: `${plural(near, "équipe", "équipes")} à une place près`, points: near * STANDINGS_POINTS.ONE_OFF });
  const bonus = STANDINGS_POINTS.BONUS.find((b) => exact >= b.teams); // paliers du plus haut au plus bas
  if (bonus) lines.push({ label: `Bonus ${bonus.teams} places exactes`, points: bonus.points });

  return { points: lines.reduce((s, l) => s + l.points, 0), final: true, lines };
}

const ROUND_POINTS: Record<Round, number> = { 1: B.R1, 2: B.R2, 3: B.CF, 4: B.CHAMPION };
const ROUND_LABELS: Record<Round, string> = {
  1: "1er tour",
  2: "Demi-finales de conférence",
  3: "Finales de conférence",
  4: "Finale NBA",
};

const samePair = (s: ActualSeries, p: SeriesPrediction) =>
  (s.teams[0] === p.team1Id && s.teams[1] === p.team2Id) || (s.teams[0] === p.team2Id && s.teams[1] === p.team1Id);

function gradeBracket(data: PreseasonBracketData, results: SeasonResults): Grade {
  const lines: GradeLine[] = [];
  let final = true;

  // Play-in : équipe prévue 7e ou 8e, qualifiée en 7e ou 8e
  let playin = 0;
  for (const conf of ["east", "west"] as const) {
    const qualified = results.playin[conf];
    if (!qualified) { final = false; continue; }
    for (const id of [data[conf].playin.seed7, data[conf].playin.seed8]) if (qualified.has(id)) playin++;
  }
  if (playin) lines.push({ label: `Play-in : ${plural(playin, "équipe qualifiée", "équipes qualifiées")}`, points: playin * B.PLAYIN_TEAM });

  // Séries : par équipe qui passe le tour (même contre un autre adversaire),
  // bonus si la série prévue a eu lieu avec le bon vainqueur et le bon nombre de matchs
  const picks: Record<Round, SeriesPrediction[]> = {
    1: [...data.east.r1, ...data.west.r1],
    2: [...data.east.r2, ...data.west.r2],
    3: [data.east.confFinals, data.west.confFinals],
    4: [data.finals],
  };
  for (const r of ROUNDS) {
    const round = results.rounds[r];
    if (!round.complete) final = false;
    const winners = new Set(round.series.map((s) => s.winnerId).filter(Boolean));
    let teams = 0;
    let games = 0;
    for (const p of picks[r]) {
      if (!p || !winners.has(p.predictedWinnerId)) continue;
      teams++;
      const s = round.series.find((x) => samePair(x, p));
      if (s && s.winnerId === p.predictedWinnerId && s.games === p.predictedGames) games++;
    }
    if (teams) {
      lines.push({
        label:  r === 4 ? "Champion NBA trouvé" : `${ROUND_LABELS[r]} : ${plural(teams, "équipe qualifiée", "équipes qualifiées")}`,
        points: teams * ROUND_POINTS[r],
      });
    }
    if (games) {
      lines.push({
        label:  `${ROUND_LABELS[r]} : ${plural(games, "bon nombre de matchs", "bons nombres de matchs")}`,
        points: games * Math.round(ROUND_POINTS[r] * B.GAMES_BONUS),
      });
    }
  }

  // MVP des Finales
  const mvp = results.awards.FINALS_MVP;
  if (!mvp) final = false;
  else if (mvp === data.mvpFinals) lines.push({ label: "MVP des Finales trouvé", points: B.FINALS_MVP });

  return { points: lines.reduce((s, l) => s + l.points, 0), final, lines };
}

interface GradingContext { results: SeasonResults; boards: AwardBoards; nbaCupOdds: Map<string, number> }

export function gradePrediction(type: string, data: unknown, ctx: GradingContext): Grade {
  const d = (data ?? {}) as Record<string, unknown>;
  switch (type) {
    case "PRESEASON_NBA_CUP_CHAMPION": return gradeNbaCup(d as { teamId?: string }, ctx.results, ctx.nbaCupOdds);
    case "PRESEASON_MVP_SEASON":
    case "PRESEASON_DPOY":
    case "PRESEASON_ROOKIE":           return gradeAward(type as PlayerAwardType, d as { playerId?: string }, ctx.results, ctx.boards);
    case "PRESEASON_NBA_STANDINGS":    return gradeStandings(d as unknown as StandingsPredictionData, ctx.results);
    case "PRESEASON_BRACKET":          return gradeBracket(d as unknown as PreseasonBracketData, ctx.results);
    default:                           throw new Error(`Type de pari inconnu : ${type}`);
  }
}

// ─── Passage complet ──────────────────────────────────────────────────────────

export interface SeasonBetsGrading {
  /** Paris dont les points ou le statut ont changé. */
  updated:  number;
  /** Paris notés définitivement. */
  graded:   number;
  total:    number;
  /** Raison si rien n'a été noté (paris encore ouverts, aucun pari). */
  skipped?: string;
  problems: string[];
}

export async function gradeSeasonBets(
  prisma: PrismaClient,
  season: string,
  log: (m: string) => void = () => {}
): Promise<SeasonBetsGrading> {
  const deadline = await getPreseasonDeadline(prisma, season);
  if (Date.now() < deadline.getTime()) {
    return { updated: 0, graded: 0, total: 0, skipped: "paris encore ouverts", problems: [] };
  }

  const predictions = await prisma.specialPrediction.findMany({
    where:  { season, type: { in: [...PRESEASON_BET_TYPES] } },
    select: { id: true, type: true, data: true, pointsEarned: true, status: true, breakdown: true },
  });
  if (predictions.length === 0) return { updated: 0, graded: 0, total: 0, skipped: "aucun pari", problems: [] };

  const [results, teams, boards] = await Promise.all([
    loadSeasonResults(prisma, season),
    loadSeasonTeams(prisma, season),
    getAwardBoards(prisma, season),
  ]);
  const ctx: GradingContext = { results, boards, nbaCupOdds: await getNbaCupOdds(prisma, season, teams) };
  if (boards.unmatched.length) log(`⚠️  Cotes des trophées, joueurs introuvables : ${boards.unmatched.join(", ")}`);

  const problems: string[] = [];
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  let graded = 0;
  for (const p of predictions) {
    let grade: Grade;
    try {
      grade = gradePrediction(p.type, p.data, ctx);
    } catch (err) {
      problems.push(`Pari ${p.type} illisible (${p.id}) : ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const status = grade.final ? "GRADED" : "LOCKED";
    const breakdown = { final: grade.final, lines: grade.lines };
    if (grade.final) graded++;
    if (p.pointsEarned !== grade.points || p.status !== status || stableStringify(p.breakdown) !== stableStringify(breakdown)) {
      updates.push(prisma.specialPrediction.update({
        where: { id: p.id },
        data:  { pointsEarned: grade.points, status, breakdown: breakdown as unknown as Prisma.InputJsonValue },
      }));
    }
  }

  for (let i = 0; i < updates.length; i += 50) await prisma.$transaction(updates.slice(i, i + 50));

  const known = [
    results.nbaCupChampion && "NBA Cup",
    results.standings && "classement final",
    ROUNDS.some((r) => results.rounds[r].series.some((s) => s.winnerId)) && "playoffs",
    Object.keys(results.awards).length > 0 && "trophées",
  ].filter(Boolean);
  log(`🏆 Paris de saison : ${updates.length} mis à jour, ${graded}/${predictions.length} notés définitivement`
    + (known.length ? ` (résultats connus : ${known.join(", ")})` : " (aucun résultat connu pour l'instant)"));

  return { updated: updates.length, graded, total: predictions.length, problems };
}
