/**
 * Historique des tâches de mise à jour (CRON Vercel et boutons de l'admin) — table CronRun.
 * L'enregistrement ne fait jamais échouer une tâche : ses erreurs sont seulement journalisées.
 */

import type { Prisma, PrismaClient } from "@/generated/prisma";

export type JobName =
  | "morning-update"
  | "update-injuries"
  | "refresh-night"
  | "reprocess-game"
  | "recalculate-standings"
  | "grade-season-bets";

export type JobTrigger = "cron" | "admin";

export const JOB_LABELS: Record<JobName, string> = {
  "morning-update":        "Mise à jour du matin",
  "update-injuries":       "Blessures du soir",
  "refresh-night":         "Mise à jour d’une nuit",
  "reprocess-game":        "Retraitement d’un match",
  "recalculate-standings": "Recalcul du classement",
  "grade-season-bets":     "Notation des paris de saison",
};

/** Compteurs affichés dans l'admin (clé → libellé). */
export const SUMMARY_LABELS: Record<string, string> = {
  game:             "Match",
  night:            "Nuit",
  gamesProcessed:   "matchs traités",
  deferred:         "box scores en attente",
  remaining:        "matchs restants",
  standingsTeams:   "équipes recalculées",
  scheduleCreated:  "matchs créés",
  scheduleUpdated:  "matchs mis à jour",
  teamsOk:          "effectifs lus",
  moved:            "transferts",
  created:          "nouveaux joueurs",
  freeAgents:       "agents libres",
  injured:          "blessés",
  injuriesUpdated:  "blessures modifiées",
  recovered:        "rétablis",
  predictionsReset: "pronos recalculés",
  seasonBetsUpdated: "paris de saison mis à jour",
  seasonBetsGraded:  "paris de saison notés",
};

/** Résultat commun à toutes les tâches. */
export interface JobResult {
  job:        JobName;
  ok:         boolean;
  /** La tâche a planté (et pas seulement un point à vérifier). */
  fatal:      boolean;
  durationMs: number;
  summary:    Record<string, number | string>;
  problems:   string[];
  logs:       string[];
}

const KEEP_DAYS     = 60;
const MAX_LOG_LINES = 200;

export async function recordJobRun(prisma: PrismaClient, trigger: JobTrigger, r: JobResult): Promise<void> {
  try {
    await prisma.cronRun.create({
      data: {
        job:        r.job,
        trigger,
        ok:         r.ok,
        durationMs: r.durationMs,
        summary:    r.summary as Prisma.InputJsonObject,
        problems:   r.problems,
        logs:       r.logs.slice(-MAX_LOG_LINES),
      },
    });
    // Ménage : l'historique ne garde que les 60 derniers jours
    await prisma.cronRun.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } });
  } catch (err) {
    console.error("[cron-runs] Enregistrement impossible :", err);
  }
}
