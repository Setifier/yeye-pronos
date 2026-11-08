import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runInjuriesUpdate } from "@/lib/update-jobs";

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
 * Contenu : src/lib/update-jobs.ts → runInjuriesUpdate (même tâche que le bouton de l'admin),
 * enregistrée dans l'historique de l'admin.
 *
 * Sécurité : header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runInjuriesUpdate(prisma, "cron");
  return NextResponse.json({ success: !result.fatal, ...result }, { status: result.fatal ? 500 : 200 });
}
