/**
 * Tâches de mise à jour, partagées par les CRON Vercel et les boutons de l'admin.
 * Chaque tâche renvoie un JobResult et s'enregistre dans l'historique (CronRun).
 *
 * Limite Vercel : 60 s par exécution. Le traitement des matchs s'arrête de lui-même vers 38 s ;
 * les matchs restants sont repris au passage suivant (pipeline idempotent).
 */

import type { PrismaClient } from "@/generated/prisma";
import { runGamePipeline, defaultSyncWindow, type PipelineResult } from "@/lib/game-processing";
import { syncRostersAndInjuries } from "@/lib/roster-sync";
import { recalculateAllStandings } from "@/lib/standings-calculator";
import { alertAdmins } from "@/lib/admin-alert";
import { recordJobRun, type JobName, type JobResult, type JobTrigger } from "@/lib/cron-runs";
import { toNightDate } from "@/lib/game-night";
import { getCurrentSeason } from "@/types/season";

const GAME_PROCESSING_BUDGET_MS = 38_000;
const SLOW_RUN_MS = 50_000;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Journal d'une tâche : gardé pour l'admin et écrit dans les logs Vercel. */
function createJob(job: JobName, prefix: string) {
  const started  = Date.now();
  const logs: string[] = [];
  const problems: string[] = [];
  const summary: JobResult["summary"] = {};
  const log = (m: string) => { logs.push(m); console.log(`[${prefix}] ${m}`); };

  const finish = (fatal = false): JobResult => {
    const durationMs = Date.now() - started;
    if (durationMs > SLOW_RUN_MS) problems.push(`Exécution lente : ${Math.round(durationMs / 1000)} s (limite Vercel 60 s)`);
    return { job, ok: problems.length === 0, fatal, durationMs, summary, problems, logs };
  };

  return { log, problems, summary, finish };
}

/** Compteurs et points d'attention d'un passage du pipeline des matchs. */
function collectPipeline(p: PipelineResult, summary: JobResult["summary"], problems: string[]) {
  const deferred = p.processed.filter((g) => g.deferred).length;
  summary.gamesProcessed = p.processed.length - deferred;
  summary.standingsTeams = p.standings;
  if (deferred)    summary.deferred  = deferred;
  if (p.remaining) summary.remaining = p.remaining;
  if (p.schedule) {
    summary.scheduleCreated = p.schedule.created;
    summary.scheduleUpdated = p.schedule.updated;
  }

  if (p.remaining > 0) {
    problems.push(`${p.remaining} match(s) terminé(s) pas encore traité(s) faute de temps : repris au prochain passage, ou tout de suite depuis l'admin (« Lancer la mise à jour »)`);
  }
  if (deferred > 0) {
    problems.push(`${deferred} box score(s) pas encore publié(s) par ESPN : nouvel essai au prochain passage`);
  }
  for (const e of p.schedule?.errors.slice(0, 5) ?? []) problems.push(`Calendrier : ${e}`);
}

/** Effectifs + blessures, avec leurs compteurs. */
async function syncRostersStep(
  prisma: PrismaClient,
  log: (m: string) => void,
  summary: JobResult["summary"],
  problems: string[]
) {
  try {
    const { rosters, injuries } = await syncRostersAndInjuries(prisma, { log });
    summary.teamsOk         = rosters.teamsOk;
    summary.created         = rosters.created.length;
    summary.moved           = rosters.moved.length;
    summary.freeAgents      = rosters.freeAgents.length;
    summary.injured         = injuries.injured;
    summary.injuriesUpdated = injuries.updated;
    summary.recovered       = injuries.recovered.length;
    if (rosters.teamsOk < 30) {
      problems.push(`Effectifs : ${rosters.teamsOk}/30 équipes lues (${rosters.teamsFailed.join(", ")})`);
    }
  } catch (err) {
    log(`⚠️  Effectifs/blessures : ${errorMessage(err)}`);
    problems.push(`Effectifs/blessures en erreur : ${errorMessage(err)}`);
  }
}

// ============================================
// TÂCHES
// ============================================

/**
 * Mise à jour complète (CRON du matin) : calendrier J-3 → J+7, matchs terminés (box scores, pronos,
 * moyennes), classement, séries, effectifs, blessures. Lancée par le CRON, un e-mail part vers
 * ADMIN_EMAILS si quelque chose reste à vérifier.
 */
export async function runMorningUpdate(prisma: PrismaClient, trigger: JobTrigger): Promise<JobResult> {
  const { log, problems, summary, finish } = createJob("morning-update", "MORNING");
  let fatal = false;

  try {
    const window = defaultSyncWindow();
    const pipeline = await runGamePipeline(prisma, {
      season: getCurrentSeason(),
      syncFrom: window.from,
      syncTo: window.to,
      timeBudgetMs: GAME_PROCESSING_BUDGET_MS,
      log,
    });
    collectPipeline(pipeline, summary, problems);
    await syncRostersStep(prisma, log, summary, problems);
  } catch (err) {
    fatal = true;
    log(`❌ ${errorMessage(err)}`);
    problems.push(`Erreur : ${errorMessage(err)}`);
  }

  const result = finish(fatal);
  await recordJobRun(prisma, trigger, result);

  if (trigger === "cron" && !result.ok) {
    log(`⚠️  ${result.problems.length} point(s) à vérifier — e-mail aux administrateurs`);
    await alertAdmins(
      fatal ? "Échec de la mise à jour du matin" : "Mise à jour du matin incomplète",
      fatal
        ? [...result.problems, "Rien n'est perdu : le passage suivant reprend tout. Pour rattraper tout de suite : « Lancer la mise à jour » dans l'admin."]
        : result.problems
    );
  }
  return result;
}

/** Effectifs + blessures (CRON du soir, avant les matchs). */
export async function runInjuriesUpdate(prisma: PrismaClient, trigger: JobTrigger): Promise<JobResult> {
  const { log, problems, summary, finish } = createJob("update-injuries", "INJURIES");
  await syncRostersStep(prisma, log, summary, problems);
  const result = finish();
  await recordJobRun(prisma, trigger, result);
  return result;
}

/** Calendrier et matchs d'une nuit (date US Eastern) : scores à jour, matchs terminés traités. */
export async function refreshNight(prisma: PrismaClient, night: string, trigger: JobTrigger): Promise<JobResult> {
  const { log, problems, summary, finish } = createJob("refresh-night", "NIGHT");
  summary.night = night;
  let fatal = false;
  try {
    const pipeline = await runGamePipeline(prisma, {
      season: getCurrentSeason(new Date(`${night}T12:00:00Z`)),
      syncFrom: night,
      syncTo: night,
      timeBudgetMs: GAME_PROCESSING_BUDGET_MS,
      log,
    });
    collectPipeline(pipeline, summary, problems);
  } catch (err) {
    fatal = true;
    log(`❌ ${errorMessage(err)}`);
    problems.push(`Erreur : ${errorMessage(err)}`);
  }
  const result = finish(fatal);
  await recordJobRun(prisma, trigger, result);
  return result;
}

/**
 * Retraite un match terminé : pronos remis en attente puis recalculés, score relu sur ESPN,
 * box score, moyennes et classement refaits. À utiliser si un résultat est faux.
 */
export async function reprocessGame(prisma: PrismaClient, gameId: string, trigger: JobTrigger): Promise<JobResult> {
  const { log, problems, summary, finish } = createJob("reprocess-game", "REPROCESS");
  let fatal = false;

  try {
    const game = await prisma.game.findUnique({
      where:  { id: gameId },
      select: {
        id: true, season: true, gameDate: true, status: true,
        homeTeam: { select: { abbreviation: true } },
        awayTeam: { select: { abbreviation: true } },
      },
    });
    if (!game) throw new Error("Match introuvable");
    summary.game = `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`;

    // 1. Le match redevient « à traiter » et ses pronos repartent en attente
    const [reset] = await prisma.$transaction([
      prisma.prediction.updateMany({
        where: { gameId, result: { in: ["WON", "LOST"] } },
        data:  { result: "PENDING", pointsEarned: 0, marginBonusPoints: 0, topScorerBonusPoints: 0, comboBonusPoints: 0 },
      }),
      prisma.game.update({ where: { id: gameId }, data: { scoreMarginCategory: null } }),
    ]);
    summary.predictionsReset = reset.count;
    log(`↺ ${summary.game} remis à traiter (${reset.count} prono(s) en attente)`);

    // 2. Même chemin que le CRON, limité à la nuit du match
    const night = toNightDate(game.gameDate);
    const pipeline = await runGamePipeline(prisma, {
      season: game.season,
      syncFrom: night,
      syncTo: night,
      timeBudgetMs: GAME_PROCESSING_BUDGET_MS,
      log,
    });
    collectPipeline(pipeline, summary, problems);
    if (!pipeline.processed.some((g) => g.gameId === gameId && !g.deferred)) {
      problems.push("Le match n'a pas pu être retraité (pas terminé sur ESPN, ou box score indisponible) : nouvel essai au prochain passage");
    }
  } catch (err) {
    fatal = true;
    log(`❌ ${errorMessage(err)}`);
    problems.push(`Erreur : ${errorMessage(err)}`);
  }

  const result = finish(fatal);
  await recordJobRun(prisma, trigger, result);
  return result;
}

/** Classement complet de la saison (bilans + rangs conférence/division). */
export async function recalculateStandingsJob(prisma: PrismaClient, trigger: JobTrigger): Promise<JobResult> {
  const { log, problems, summary, finish } = createJob("recalculate-standings", "STANDINGS");
  let fatal = false;
  try {
    await recalculateAllStandings(getCurrentSeason());
    summary.standingsTeams = 30;
    log("📊 Classement recalculé pour les 30 équipes");
  } catch (err) {
    fatal = true;
    log(`❌ ${errorMessage(err)}`);
    problems.push(`Erreur : ${errorMessage(err)}`);
  }
  const result = finish(fatal);
  await recordJobRun(prisma, trigger, result);
  return result;
}
