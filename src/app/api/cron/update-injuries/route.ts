import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRostersAndInjuries } from "@/lib/roster-sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Effectifs + blessures (déclenchement manuel ; le CRON du matin l'exécute déjà).
 *
 * Les rosters ESPN servent de complément à l'endpoint blessures et garantissent
 * que chaque joueur est rattaché à la bonne équipe.
 *
 * Sécurité : header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs: string[] = [];
  const log = (m: string) => { logs.push(m); console.log(`[INJURIES] ${m}`); };

  try {
    const { rosters, injuries } = await syncRostersAndInjuries(prisma, { log });
    return NextResponse.json({
      success:  true,
      teamsOk:  rosters.teamsOk,
      moved:    rosters.moved,
      created:  rosters.created,
      freeAgents: rosters.freeAgents,
      injured:  injuries.injured,
      updated:  injuries.updated,
      recovered: injuries.recovered,
      notFound: injuries.notFound,
      timestamp: new Date().toISOString(),
      logs,
    });
  } catch (error) {
    console.error("[INJURIES] Error:", error);
    return NextResponse.json(
      { error: "Error updating injuries", details: error instanceof Error ? error.message : "Unknown error", logs },
      { status: 500 }
    );
  }
}
