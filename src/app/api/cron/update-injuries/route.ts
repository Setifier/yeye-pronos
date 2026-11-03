import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRostersAndInjuries } from "@/lib/roster-sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Effectifs + blessures, juste avant les matchs.
 *
 * CRON du soir — vercel.json : "0 21 * * *" (UTC, sans changement d'heure).
 *   Plan Hobby : déclenchement entre 21:00 et 21:59 UTC
 *   = 22h-23h Paris en hiver (23h-00h en été) = 16h-17h à New York (17h-18h en été),
 *   avant les premiers coups d'envoi de 19h ET. Les matchs du week-end en journée ne sont pas couverts.
 *   Le CRON du matin fait aussi cette mise à jour (après les matchs de la nuit).
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
