import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNbaAwardsPeriod, runNbaAwardsUpdate } from "@/lib/update-jobs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Trophées NBA de la saison en cours (ESPN), au fil des annonces.
 *
 * CRON de midi — vercel.json : "0 12 * * *" (UTC) = 13h-14h Paris en hiver.
 * Ne fait rien hors des périodes de remise (août → novembre, mars) : voir isNbaAwardsPeriod.
 * Décembre : MVP et équipe type de la NBA Cup ; février : MVP du All-Star Game ;
 * avril → juin : trophées de la saison, All-NBA…, MVP des finales de conférence et des Finales.
 *
 * Contenu : src/lib/update-jobs.ts → runNbaAwardsUpdate (même tâche que le bouton de l'admin).
 * Sécurité : header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isNbaAwardsPeriod()) {
    return NextResponse.json({ success: true, skipped: "Pas de trophées à cette période de l'année" });
  }

  const result = await runNbaAwardsUpdate(prisma, "cron");
  return NextResponse.json({ success: !result.fatal, ...result }, { status: result.fatal ? 500 : 200 });
}
