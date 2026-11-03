import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGamePipeline, defaultSyncWindow } from "@/lib/game-processing";
import { syncRostersAndInjuries } from "@/lib/roster-sync";
import { alertAdmins } from "@/lib/admin-alert";
import { getCurrentSeason } from "@/types/season";

// Limite Vercel Hobby (sans Fluid compute) : 60 s. Le traitement s'arrête de lui-même
// avant (budget temps) ; les matchs restants sont repris au passage suivant.
// Les fonctions tournent à Londres (vercel.json → regions), comme la base Neon (eu-west-2).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GAME_PROCESSING_BUDGET_MS = 38_000;
const SLOW_RUN_MS = 50_000;

/**
 * CRON quotidien — vercel.json : "0 8 * * *"
 *   Vercel planifie en UTC, sans changement d'heure :
 *   08:00 UTC = 09h00 Paris en heure d'hiver (fin oct. → fin mars), 10h00 en heure d'été.
 *   (Plan Hobby : déclenchement à un moment quelconque entre 08:00 et 08:59 UTC.)
 *   Le dernier match de la nuit (coup d'envoi 22h30 ET) finit vers 01h15 ET
 *   = 06:15 UTC en hiver → ~1h45 de marge, prolongations comprises.
 *
 * Les matchs traités ce matin-là portent la date US Eastern de la VEILLE
 * (ex. match du 25/10 à 22h30 ET = 26/10 à 03h30 Paris → affiché au 25/10).
 *
 * 1. Calendrier J-3 → J+7 : création des nouveaux matchs (ex. NBA Cup à élimination
 *    directe, matchs ajoutés en décembre), horaires, reports, scores.
 * 2. Matchs terminés : box scores, pronos, moyennes joueurs.
 * 3. Classement des équipes concernées + séries playoffs.
 * 4. Effectifs (transferts, signatures, agents libres) + blessures.
 * 5. Si quelque chose est resté incomplet : e-mail aux administrateurs (ADMIN_EMAILS).
 *    Aucun e-mail quand tout va bien.
 *
 * Sécurité : header `Authorization: Bearer $CRON_SECRET` (envoyé automatiquement par Vercel).
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const season  = getCurrentSeason();
  const logs: string[] = [];
  const log = (m: string) => { logs.push(m); console.log(`[MORNING] ${m}`); };

  try {
    const window = defaultSyncWindow();
    const pipeline = await runGamePipeline(prisma, {
      season,
      syncFrom: window.from,
      syncTo:   window.to,
      timeBudgetMs: GAME_PROCESSING_BUDGET_MS,
      log,
    });

    let rosters: Awaited<ReturnType<typeof syncRostersAndInjuries>> | null = null;
    let rostersError: string | null = null;
    try {
      rosters = await syncRostersAndInjuries(prisma, { log });
    } catch (err) {
      rostersError = err instanceof Error ? err.message : String(err);
      log(`⚠️  Effectifs/blessures : ${rostersError}`);
    }

    const durationMs = Date.now() - started;
    const deferred   = pipeline.processed.filter((g) => g.deferred).length;

    // ── Ce qui mérite l'attention d'un admin ──
    const problems: string[] = [];
    if (pipeline.remaining > 0) {
      problems.push(`${pipeline.remaining} match(s) terminé(s) non traité(s) faute de temps : repris demain, ou tout de suite avec npm run db:run-update`);
    }
    if (deferred > 0) {
      problems.push(`${deferred} box score(s) pas encore publié(s) par ESPN : nouvel essai au prochain passage`);
    }
    for (const e of pipeline.schedule?.errors.slice(0, 5) ?? []) problems.push(`Calendrier : ${e}`);
    if (rostersError) problems.push(`Effectifs/blessures en erreur : ${rostersError}`);
    else if (rosters && rosters.rosters.teamsOk < 30) {
      problems.push(`Effectifs : ${rosters.rosters.teamsOk}/30 équipes lues (${rosters.rosters.teamsFailed.join(", ")})`);
    }
    if (durationMs > SLOW_RUN_MS) problems.push(`Exécution lente : ${(durationMs / 1000).toFixed(0)} s (limite Vercel 60 s)`);

    if (problems.length > 0) {
      log(`⚠️  ${problems.length} point(s) à vérifier — e-mail aux administrateurs`);
      await alertAdmins("Mise à jour du matin incomplète", problems);
    }

    return NextResponse.json({
      success: true,
      ok: problems.length === 0,
      problems,
      season,
      window,
      schedule: pipeline.schedule && {
        created: pipeline.schedule.created,
        updated: pipeline.schedule.updated,
        skipped: pipeline.schedule.skipped,
        errors:  pipeline.schedule.errors,
      },
      games: {
        processed: pipeline.processed.filter((g) => !g.deferred).length,
        deferred,
        remaining: pipeline.remaining,
      },
      standings: { teamsRecalculated: pipeline.standings },
      playoffs:  pipeline.series,
      rosters: rosters && {
        teamsOk:    rosters.rosters.teamsOk,
        created:    rosters.rosters.created.length,
        moved:      rosters.rosters.moved,
        freeAgents: rosters.rosters.freeAgents,
      },
      injuries: rosters && {
        injured:   rosters.injuries.injured,
        updated:   rosters.injuries.updated,
        recovered: rosters.injuries.recovered.length,
      },
      rostersError,
      durationMs,
      logs,
    });
  } catch (error) {
    console.error("[MORNING] Fatal error:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    await alertAdmins("Échec de la mise à jour du matin", [
      `Erreur : ${details}`,
      "Rien n'est perdu : le passage suivant reprend tout. Pour rattraper tout de suite : npm run db:run-update",
    ]);
    return NextResponse.json(
      { error: "Morning update failed", details, logs },
      { status: 500 }
    );
  }
}
