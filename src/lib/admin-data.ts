/**
 * Données des pages de l'admin (lecture seule) : santé, joueurs, matchs d'une nuit, signalements.
 * Les contrôles reprennent ceux de `npm run db:verify-season --quick` (base seule, sans ESPN).
 */

import type { Prisma, PrismaClient } from "@/generated/prisma";
import { getCurrentSeason } from "@/types/season";
import { PRESEASON_BET_TYPES } from "@/types/special-predictions";
import { getCurrentNightDate, toNightDate, shiftNightDate, formatNight } from "@/lib/game-night";
import { getSeasonRanking } from "@/lib/season-ranking";
import type { JobName } from "@/lib/cron-runs";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PRESEASON_TOTAL = PRESEASON_BET_TYPES.length;

// ============================================
// HISTORIQUE DES TÂCHES
// ============================================

export interface RunInfo {
  id:         string;
  job:        JobName;
  trigger:    "cron" | "admin";
  ok:         boolean;
  durationMs: number;
  createdAt:  string;
  summary:    Record<string, number | string>;
  problems:   string[];
  logs:       string[];
}

/** null si la table n'existe pas encore (avant `npx prisma db push`). */
async function loadRuns(prisma: PrismaClient, where: Prisma.CronRunWhereInput, take: number): Promise<RunInfo[] | null> {
  try {
    const rows = await prisma.cronRun.findMany({ where, orderBy: { createdAt: "desc" }, take });
    return rows.map((r) => ({
      id:         r.id,
      job:        r.job as JobName,
      trigger:    r.trigger === "cron" ? "cron" : "admin",
      ok:         r.ok,
      durationMs: r.durationMs,
      createdAt:  r.createdAt.toISOString(),
      summary:    r.summary && typeof r.summary === "object" && !Array.isArray(r.summary)
        ? (r.summary as Record<string, number | string>)
        : {},
      problems:   r.problems,
      logs:       r.logs,
    }));
  } catch {
    return null;
  }
}

// ============================================
// NUIT NBA
// ============================================

/** Plage large autour d'une nuit ET, puis filtrage exact (même règle que bet-games). */
function nightRange(night: string) {
  return {
    gte: new Date(`${night}T00:00:00Z`),
    lte: new Date(`${shiftNightDate(night, 1)}T15:00:00Z`),
  };
}

const notCancelledIfNecessary: Prisma.GameWhereInput = {
  NOT: { AND: [{ isIfNecessary: true }, { status: "CANCELLED" }] },
};

const activePlayers: Prisma.UserWhereInput = {
  hasCompletedOnboarding: true,
  OR: [{ banned: false }, { banned: null }],
};

// ============================================
// SANTÉ
// ============================================

export type CheckStatus = "ok" | "warn" | "error";
export type FixAction = "morning" | "injuries" | "standings";

export interface HealthCheck {
  id:     string;
  label:  string;
  status: CheckStatus;
  detail: string;
  fix?:   FixAction;
}

export interface HealthOverview {
  season:       string;
  checks:       HealthCheck[];
  historyReady: boolean;
  lastMorning:  RunInfo | null;
  lastInjuries: RunInfo | null;
  history:      RunInfo[];
  night: {
    date:        string;
    label:       string;
    relative:    string | null;
    games:       number;
    finished:    number;
    firstGameAt: string | null;
    bettors:     number;
    players:     number;
    predictions: number;
  };
  players: { total: number; verified: number; onboarded: number; active7d: number; preseasonComplete: number };
  openBugs: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

type CountByUser = { userId: string; _count: { _all: number } };

/** Nombre de pronos par joueur sur une liste de matchs. */
async function countBetsByUser(prisma: PrismaClient, gameIds: string[]): Promise<CountByUser[]> {
  if (gameIds.length === 0) return [];
  const rows = await prisma.prediction.groupBy({
    by: ["userId"], where: { gameId: { in: gameIds } }, _count: { _all: true },
  });
  return rows.map((r) => ({ userId: r.userId, _count: { _all: r._count._all } }));
}

export async function getHealthOverview(prisma: PrismaClient): Promise<HealthOverview> {
  const season = getCurrentSeason();
  const now = Date.now();
  const night = getCurrentNightDate(new Date(now));

  const [morningRuns, injuryRuns, historyRuns] = await Promise.all([
    loadRuns(prisma, { job: "morning-update" }, 1),
    loadRuns(prisma, { job: "update-injuries" }, 1),
    loadRuns(prisma, {}, 15),
  ]);
  const historyReady = historyRuns !== null;
  const lastMorning  = morningRuns?.[0] ?? null;
  const lastInjuries = injuryRuns?.[0] ?? null;

  // Un match commencé 4 h avant la dernière mise à jour du matin devrait être terminé et traité
  const staleBefore = lastMorning
    ? new Date(new Date(lastMorning.createdAt).getTime() - 4 * HOUR)
    : new Date(now - 30 * HOUR);

  const [
    unprocessed, stale, noBoxScore, pendingOnProcessed,
    standingsSum, countedGames, cupGroupGames, cupGroupMissing,
  ] = await Promise.all([
    prisma.game.count({ where: { season, status: "FINAL", scoreMarginCategory: null } }),
    prisma.game.count({ where: { season, status: { in: ["SCHEDULED", "LIVE"] }, gameDate: { lt: staleBefore } } }),
    prisma.game.count({ where: { season, status: "FINAL", scoreMarginCategory: { not: null }, playerStats: { none: {} } } }),
    prisma.prediction.count({ where: { result: "PENDING", game: { season, scoreMarginCategory: { not: null } } } }),
    prisma.teamSeasonStats.aggregate({ where: { season }, _sum: { wins: true, losses: true } }),
    // Mêmes matchs que le calcul du classement (finale NBA Cup exclue)
    prisma.game.count({
      where: {
        season, status: "FINAL", seasonType: "Regular Season", winnerId: { not: null },
        OR: [{ nbaCupRound: null }, { nbaCupRound: { not: "Championship" } }],
      },
    }),
    prisma.game.count({ where: { season, nbaCupRound: "GroupPlay" } }),
    prisma.game.count({ where: { season, nbaCupRound: "GroupPlay", nbaCupGroup: null } }),
  ]);

  const checks: HealthCheck[] = [];

  // ── Mises à jour automatiques ──
  if (!historyReady) {
    checks.push({
      id: "history", label: "Historique des mises à jour", status: "warn",
      detail: "Table pas encore créée : lancer `npx prisma db push`",
    });
  } else {
    if (!lastMorning) {
      checks.push({ id: "morning", label: "Mise à jour du matin", status: "warn", detail: "Aucun passage enregistré pour l’instant", fix: "morning" });
    } else if (now - new Date(lastMorning.createdAt).getTime() > 26 * HOUR) {
      checks.push({ id: "morning", label: "Mise à jour du matin", status: "error", detail: "Pas de passage depuis plus de 24 h", fix: "morning" });
    } else if (!lastMorning.ok) {
      checks.push({ id: "morning", label: "Mise à jour du matin", status: "error", detail: lastMorning.problems[0] ?? "Passage incomplet", fix: "morning" });
    } else {
      checks.push({ id: "morning", label: "Mise à jour du matin", status: "ok", detail: "Dernier passage complet" });
    }

    if (!lastInjuries) {
      checks.push({ id: "injuries", label: "Blessures du soir", status: "ok", detail: "Premier passage ce soir entre 22 h et 23 h" });
    } else if (now - new Date(lastInjuries.createdAt).getTime() > 26 * HOUR) {
      checks.push({ id: "injuries", label: "Blessures du soir", status: "warn", detail: "Pas de passage depuis plus de 24 h", fix: "injuries" });
    } else if (!lastInjuries.ok) {
      checks.push({ id: "injuries", label: "Blessures du soir", status: "warn", detail: lastInjuries.problems[0] ?? "Passage incomplet", fix: "injuries" });
    } else {
      checks.push({ id: "injuries", label: "Blessures du soir", status: "ok", detail: "Dernier passage complet" });
    }
  }

  // ── Données ──
  checks.push(unprocessed > 0
    ? { id: "unprocessed", label: "Matchs terminés", status: "error", detail: `${plural(unprocessed, "match terminé pas encore traité", "matchs terminés pas encore traités")} (pronos et stats en attente)`, fix: "morning" }
    : { id: "unprocessed", label: "Matchs terminés", status: "ok", detail: "Tous traités (pronos, stats, classement)" });

  checks.push(stale > 0
    ? { id: "stale", label: "Scores", status: "error", detail: `${plural(stale, "match passé encore « programmé »", "matchs passés encore « programmés »")}`, fix: "morning" }
    : { id: "stale", label: "Scores", status: "ok", detail: "À jour" });

  checks.push(noBoxScore > 0
    ? { id: "boxscores", label: "Box scores", status: "warn", detail: `${plural(noBoxScore, "match traité sans box score", "matchs traités sans box score")} (à retraiter depuis Matchs)` }
    : { id: "boxscores", label: "Box scores", status: "ok", detail: "Présents pour chaque match traité" });

  checks.push(pendingOnProcessed > 0
    ? { id: "pending", label: "Pronos", status: "error", detail: `${plural(pendingOnProcessed, "prono en attente", "pronos en attente")} sur des matchs déjà traités (à retraiter depuis Matchs)` }
    : { id: "pending", label: "Pronos", status: "ok", detail: "Tous calculés" });

  const standingsGames = (standingsSum._sum.wins ?? 0) + (standingsSum._sum.losses ?? 0);
  if (standingsGames === countedGames * 2) {
    checks.push({ id: "standings", label: "Classement NBA", status: "ok", detail: "Cohérent avec les résultats" });
  } else if (unprocessed > 0) {
    checks.push({ id: "standings", label: "Classement NBA", status: "warn", detail: "Sera recalculé avec les matchs à traiter" });
  } else {
    checks.push({ id: "standings", label: "Classement NBA", status: "error", detail: "Bilans différents des résultats en base", fix: "standings" });
  }

  if (cupGroupGames > 0) {
    checks.push(cupGroupMissing > 0
      ? { id: "nbacup", label: "Groupes NBA Cup", status: "warn", detail: `${plural(cupGroupMissing, "match de poule sans groupe", "matchs de poule sans groupe")}`, fix: "morning" }
      : { id: "nbacup", label: "Groupes NBA Cup", status: "ok", detail: "Attribués" });
  }

  // ── Nuit en cours ──
  const nightGames = (await prisma.game.findMany({
    where:   { gameDate: nightRange(night), ...notCancelledIfNecessary },
    orderBy: { gameDate: "asc" },
    select:  { id: true, gameDate: true, status: true },
  })).filter((g) => toNightDate(g.gameDate) === night);
  const nightIds = nightGames.map((g) => g.id);

  const since7d = new Date(now - 7 * DAY);
  const [
    bettorGroups, onboarded, total, verified, activeSessions, activePredictions, preseasonGroups, openBugs,
  ] = await Promise.all([
    countBetsByUser(prisma, nightIds),
    prisma.user.count({ where: activePlayers }),
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.session.groupBy({ by: ["userId"], where: { updatedAt: { gte: since7d } } }),
    prisma.prediction.groupBy({ by: ["userId"], where: { updatedAt: { gte: since7d } } }),
    prisma.specialPrediction.groupBy({
      by: ["userId"], where: { season, type: { in: [...PRESEASON_BET_TYPES] } }, _count: { _all: true },
    }),
    prisma.bugReport.count({ where: { status: "OPEN" } }).catch(() => 0),
  ]);

  const nightLabel = formatNight(night, new Date(now));
  const active = new Set([...activeSessions.map((s) => s.userId), ...activePredictions.map((p) => p.userId)]);

  return {
    season,
    checks,
    historyReady,
    lastMorning,
    lastInjuries,
    history: historyRuns ?? [],
    night: {
      date:        night,
      label:       nightLabel.night,
      relative:    nightLabel.relative,
      games:       nightGames.length,
      finished:    nightGames.filter((g) => g.status === "FINAL").length,
      firstGameAt: nightGames[0]?.gameDate.toISOString() ?? null,
      bettors:     bettorGroups.length,
      players:     onboarded,
      predictions: bettorGroups.reduce((sum, g) => sum + g._count._all, 0),
    },
    players: {
      total,
      verified,
      onboarded,
      active7d:          active.size,
      preseasonComplete: preseasonGroups.filter((g) => g._count._all >= PRESEASON_TOTAL).length,
    },
    openBugs,
  };
}

// ============================================
// JOUEURS
// ============================================

export interface PlayerRow {
  id:              string;
  name:            string;
  email:           string;
  image:           string | null;
  role:            "USER" | "ADMIN";
  banned:          boolean;
  banReason:       string | null;
  emailVerified:   boolean;
  onboarded:       boolean;
  createdAt:       string;
  favoriteTeam:    string | null;
  loginMethods:    string[];
  lastActiveAt:    string | null;
  rank:            number | null;
  points:          number;
  predictions:     number;
  finished:        number;
  winRate:         number;
  preseasonDone:   number;
  tonightBets:     number;
}

export interface PlayersOverview {
  season:         string;
  preseasonTotal: number;
  tonight:        { date: string; label: string; games: number };
  rows:           PlayerRow[];
}

const maxDate = (...dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);

export async function getPlayersOverview(prisma: PrismaClient): Promise<PlayersOverview> {
  const season = getCurrentSeason();
  const night = getCurrentNightDate();

  const nightGames = (await prisma.game.findMany({
    where:  { gameDate: nightRange(night), ...notCancelledIfNecessary },
    select: { id: true, gameDate: true },
  })).filter((g) => toNightDate(g.gameDate) === night);
  const nightIds = nightGames.map((g) => g.id);

  const [users, ranking, preseason, sessions, predictionActivity, tonight] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, image: true, role: true, banned: true, banReason: true,
        emailVerified: true, hasCompletedOnboarding: true, createdAt: true,
        favoriteTeam: { select: { abbreviation: true } },
        accounts: { select: { providerId: true } },
      },
    }),
    getSeasonRanking(prisma, season),
    prisma.specialPrediction.groupBy({
      by: ["userId"], where: { season, type: { in: [...PRESEASON_BET_TYPES] } }, _count: { _all: true },
    }),
    prisma.session.groupBy({ by: ["userId"], _max: { updatedAt: true } }),
    prisma.prediction.groupBy({ by: ["userId"], _max: { updatedAt: true } }),
    countBetsByUser(prisma, nightIds),
  ]);

  const rankBy      = new Map(ranking.map((r) => [r.userId, r]));
  const preseasonBy = new Map(preseason.map((p) => [p.userId, p._count._all]));
  const sessionBy   = new Map(sessions.map((s) => [s.userId, s._max.updatedAt]));
  const activityBy  = new Map(predictionActivity.map((p) => [p.userId, p._max.updatedAt]));
  const tonightBy   = new Map(tonight.map((t) => [t.userId, t._count._all]));

  const rows: PlayerRow[] = users.map((u) => {
    const r = rankBy.get(u.id);
    const last = maxDate(sessionBy.get(u.id), activityBy.get(u.id));
    return {
      id:            u.id,
      name:          u.name,
      email:         u.email,
      image:         u.image,
      role:          u.role,
      banned:        !!u.banned,
      banReason:     u.banReason,
      emailVerified: u.emailVerified,
      onboarded:     u.hasCompletedOnboarding,
      createdAt:     u.createdAt.toISOString(),
      favoriteTeam:  u.favoriteTeam?.abbreviation ?? null,
      loginMethods:  [...new Set(u.accounts.map((a) => (a.providerId === "credential" ? "E-mail" : a.providerId === "google" ? "Google" : a.providerId)))],
      lastActiveAt:  last?.toISOString() ?? null,
      rank:          r?.rank ?? null,
      points:        r?.points ?? 0,
      predictions:   r?.predictions ?? 0,
      finished:      (r?.won ?? 0) + (r?.lost ?? 0),
      winRate:       r?.winRate ?? 0,
      preseasonDone: preseasonBy.get(u.id) ?? 0,
      tonightBets:   tonightBy.get(u.id) ?? 0,
    };
  });

  const label = formatNight(night);
  return {
    season,
    preseasonTotal: PRESEASON_TOTAL,
    tonight: { date: night, label: label.relative ?? label.short, games: nightIds.length },
    rows,
  };
}

// ============================================
// MATCHS D'UNE NUIT
// ============================================

export interface AdminGameRow {
  id:          string;
  gameDate:    string;
  status:      "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED";
  away:        { abbr: string; score: number | null };
  home:        { abbr: string; score: number | null };
  processed:   boolean;
  boxScore:    number;
  predictions: { total: number; won: number; lost: number; pending: number };
  topScorer:   string | null;
  tag:         string | null;
}

export interface GameIssue {
  id:     string;
  label:  string;
  night:  string;
  reason: "unprocessed" | "stale";
}

export interface AdminNight {
  night:    string;
  label:    string;
  relative: string | null;
  prev:     string;
  next:     string;
  games:    AdminGameRow[];
  issues:   GameIssue[];
}

/** Nuit par défaut : la dernière nuit avec un match terminé (sinon la nuit en cours). */
async function defaultAdminNight(prisma: PrismaClient): Promise<string> {
  const last = await prisma.game.findFirst({
    where:   { status: "FINAL", gameDate: { lte: new Date() } },
    orderBy: { gameDate: "desc" },
    select:  { gameDate: true },
  });
  return last ? toNightDate(last.gameDate) : getCurrentNightDate();
}

function gameTag(g: { seasonType: string; nbaCupRound: string | null; gameNumber: number | null }): string | null {
  if (g.seasonType === "Playoffs") return g.gameNumber ? `Playoffs · G${g.gameNumber}` : "Playoffs";
  if (g.seasonType === "Play-In") return "Play-in";
  if (g.nbaCupRound === "Championship") return "Finale NBA Cup";
  if (g.nbaCupRound === "Semifinal") return "NBA Cup · demi";
  if (g.nbaCupRound === "Quarterfinal") return "NBA Cup · quart";
  if (g.nbaCupRound === "GroupPlay") return "NBA Cup";
  return null;
}

export async function getAdminNight(prisma: PrismaClient, requested?: string): Promise<AdminNight> {
  const night = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : await defaultAdminNight(prisma);
  const season = getCurrentSeason();

  const games = (await prisma.game.findMany({
    where:   { gameDate: nightRange(night), ...notCancelledIfNecessary },
    orderBy: { gameDate: "asc" },
    select: {
      id: true, gameDate: true, status: true, homeScore: true, awayScore: true,
      scoreMarginCategory: true, topScorerPoints: true, seasonType: true, nbaCupRound: true, gameNumber: true,
      topScorer: { select: { fullName: true } },
      homeTeam:  { select: { abbreviation: true } },
      awayTeam:  { select: { abbreviation: true } },
      _count:    { select: { playerStats: true } },
    },
  })).filter((g) => toNightDate(g.gameDate) === night);

  const ids = games.map((g) => g.id);
  const countByResult = async (): Promise<{ gameId: string; result: string; _count: { _all: number } }[]> => {
    if (ids.length === 0) return [];
    const rows = await prisma.prediction.groupBy({
      by: ["gameId", "result"], where: { gameId: { in: ids } }, _count: { _all: true },
    });
    return rows.map((r) => ({ gameId: r.gameId, result: r.result, _count: { _all: r._count._all } }));
  };
  const [byResult, unprocessed, stale] = await Promise.all([
    countByResult(),
    prisma.game.findMany({
      where:   { season, status: "FINAL", scoreMarginCategory: null },
      orderBy: { gameDate: "asc" },
      take:    10,
      select:  { id: true, gameDate: true, homeTeam: { select: { abbreviation: true } }, awayTeam: { select: { abbreviation: true } } },
    }),
    prisma.game.findMany({
      where:   { season, status: { in: ["SCHEDULED", "LIVE"] }, gameDate: { lt: new Date(Date.now() - 30 * HOUR) } },
      orderBy: { gameDate: "asc" },
      take:    10,
      select:  { id: true, gameDate: true, homeTeam: { select: { abbreviation: true } }, awayTeam: { select: { abbreviation: true } } },
    }),
  ]);

  const counts = new Map<string, AdminGameRow["predictions"]>();
  for (const row of byResult) {
    const c = counts.get(row.gameId) ?? { total: 0, won: 0, lost: 0, pending: 0 };
    const n = row._count._all;
    if (row.result === "CANCELLED") continue;
    c.total += n;
    if (row.result === "WON") c.won += n;
    if (row.result === "LOST") c.lost += n;
    if (row.result === "PENDING") c.pending += n;
    counts.set(row.gameId, c);
  }

  const label = formatNight(night);
  const toIssue = (reason: GameIssue["reason"]) =>
    (g: { id: string; gameDate: Date; homeTeam: { abbreviation: string }; awayTeam: { abbreviation: string } }): GameIssue => ({
      id: g.id, label: `${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation}`, night: toNightDate(g.gameDate), reason,
    });

  return {
    night,
    label:    label.night,
    relative: label.relative,
    prev:     shiftNightDate(night, -1),
    next:     shiftNightDate(night, 1),
    games: games.map((g) => ({
      id:          g.id,
      gameDate:    g.gameDate.toISOString(),
      status:      g.status,
      away:        { abbr: g.awayTeam.abbreviation, score: g.awayScore },
      home:        { abbr: g.homeTeam.abbreviation, score: g.homeScore },
      processed:   g.scoreMarginCategory !== null,
      boxScore:    g._count.playerStats,
      predictions: counts.get(g.id) ?? { total: 0, won: 0, lost: 0, pending: 0 },
      topScorer:   g.topScorer ? `${g.topScorer.fullName} · ${g.topScorerPoints ?? "?"} pts` : null,
      tag:         gameTag(g),
    })),
    issues: [...unprocessed.map(toIssue("unprocessed")), ...stale.map(toIssue("stale"))],
  };
}

// ============================================
// SIGNALEMENTS
// ============================================

export type BugFilter = "open" | "resolved" | "all";

export interface BugRow {
  id:        string;
  createdAt: string;
  message:   string;
  page:      string | null;
  userAgent: string | null;
  screen:    string | null;
  email:     string | null;
  user:      { id: string; name: string } | null;
  status:    "OPEN" | "RESOLVED";
}

export async function getBugReports(prisma: PrismaClient, filter: BugFilter) {
  try {
    const [rows, open, resolved] = await Promise.all([
      prisma.bugReport.findMany({
        where:   filter === "all" ? {} : { status: filter === "open" ? "OPEN" : "RESOLVED" },
        orderBy: { createdAt: "desc" },
        take:    200,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.bugReport.count({ where: { status: "OPEN" } }),
      prisma.bugReport.count({ where: { status: "RESOLVED" } }),
    ]);
    return {
      ready: true as const,
      counts: { open, resolved, all: open + resolved },
      rows: rows.map<BugRow>((b) => ({
        id: b.id, createdAt: b.createdAt.toISOString(), message: b.message, page: b.page,
        userAgent: b.userAgent, screen: b.screen, email: b.email, user: b.user, status: b.status,
      })),
    };
  } catch {
    return { ready: false as const, counts: { open: 0, resolved: 0, all: 0 }, rows: [] as BugRow[] };
  }
}
