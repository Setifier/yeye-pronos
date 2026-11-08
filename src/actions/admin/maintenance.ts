"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";
import type { JobResult } from "@/lib/cron-runs";
import {
  runMorningUpdate,
  runInjuriesUpdate,
  refreshNight,
  reprocessGame,
  recalculateStandingsJob,
  gradeSeasonBetsJob,
} from "@/lib/update-jobs";

/**
 * Boutons de l'admin : mêmes tâches que les CRON, enregistrées dans l'historique (déclencheur « admin »).
 * Durée max 60 s (maxDuration du layout admin).
 */
async function run(task: () => Promise<JobResult>): Promise<JobResult> {
  await assertAdmin();
  const result = await task();
  revalidatePath("/admin", "layout");
  return result;
}

export async function runMorningUpdateAction() {
  return run(() => runMorningUpdate(prisma, "admin"));
}

export async function runInjuriesUpdateAction() {
  return run(() => runInjuriesUpdate(prisma, "admin"));
}

export async function recalculateStandingsAction() {
  return run(() => recalculateStandingsJob(prisma, "admin"));
}

export async function refreshNightAction(night: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) throw new Error("Date invalide");
  return run(() => refreshNight(prisma, night, "admin"));
}

export async function reprocessGameAction(gameId: string) {
  return run(() => reprocessGame(prisma, gameId, "admin"));
}

export async function gradeSeasonBetsAction() {
  return run(() => gradeSeasonBetsJob(prisma, "admin"));
}
