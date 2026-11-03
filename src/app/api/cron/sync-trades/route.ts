import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRosters } from "@/lib/roster-sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Transferts / signatures / waivers (déclenchement manuel).
 *
 * L'ancienne version parsait les textes de l'API "transactions" ESPN, ce qui ratait
 * beaucoup de cas ("Waived G X and G Y.", "Re-signed…", extensions…). Elle est remplacée
 * par une comparaison directe avec les 30 rosters ESPN : fiable et exhaustive.
 * Le CRON du matin l'exécute déjà chaque jour.
 *
 * Sécurité : header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    const r = await syncRosters(prisma, { log: (m) => logs.push(m) });
    return NextResponse.json({
      success:    true,
      teamsOk:    r.teamsOk,
      teamsFailed: r.teamsFailed,
      moved:      r.moved,
      created:    r.created,
      freeAgents: r.freeAgents,
      updated:    r.updated,
      logs,
      timestamp:  new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON TRADES] Error:", error);
    return NextResponse.json(
      { error: "Error syncing rosters", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
