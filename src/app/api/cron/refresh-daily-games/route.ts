import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncSchedule } from "@/lib/game-sync";
import { defaultSyncWindow } from "@/lib/game-processing";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Calendrier uniquement (déclenchement manuel ; le CRON du matin l'exécute déjà).
 * Synchronise J-1 → J+7 (dates US Eastern) : création des nouveaux matchs,
 * horaires, reports. Ne calcule ni pronos ni stats.
 *
 * Sécurité : header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const window = defaultSyncWindow(new Date(), 1, 7);
    const logs: string[] = [];
    const result = await syncSchedule(prisma, window.from, window.to, { log: (m) => logs.push(m) });
    return NextResponse.json({ success: true, window, ...result, logs, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[CRON] Error refreshing games:", error);
    return NextResponse.json(
      { error: "Error refreshing games", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
