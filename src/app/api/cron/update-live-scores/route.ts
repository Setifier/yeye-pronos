import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGamePipeline, defaultSyncWindow } from "@/lib/game-processing";
import { getCurrentSeason } from "@/types/season";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * CRON optionnel — scores en direct.
 *
 * Vercel Hobby limite chaque CRON à un passage par jour : cette route n'est donc PAS dans vercel.json.
 * Pour avoir les scores en direct, la faire appeler toutes les 5 min pendant les matchs
 * (ex. cron-job.org, 23h → 07h Paris) avec le header `Authorization: Bearer $CRON_SECRET`.
 *
 * Synchronise la veille et le jour US Eastern (un match du soir peut finir après minuit ET),
 * puis traite les matchs terminés (pronos, stats, classement) — même logique que le CRON du matin.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs: string[] = [];
  const log = (m: string) => { logs.push(m); console.log(`[LIVE] ${m}`); };

  try {
    const window = defaultSyncWindow(new Date(), 1, 0);
    const pipeline = await runGamePipeline(prisma, {
      season: getCurrentSeason(),
      syncFrom: window.from,
      syncTo:   window.to,
      timeBudgetMs: 40_000,
      log,
    });

    return NextResponse.json({
      success: true,
      window,
      updated:   pipeline.schedule?.updated ?? 0,
      created:   pipeline.schedule?.created ?? 0,
      finalized: pipeline.processed.filter((g) => !g.deferred).length,
      remaining: pipeline.remaining,
      standingsRecalculated: pipeline.standings,
      durationMs: pipeline.durationMs,
      logs,
    });
  } catch (error) {
    console.error("[LIVE] Error:", error);
    return NextResponse.json(
      { error: "Error updating live scores", details: error instanceof Error ? error.message : "Unknown error", logs },
      { status: 500 }
    );
  }
}
