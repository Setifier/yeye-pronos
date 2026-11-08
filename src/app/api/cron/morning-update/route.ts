import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMorningUpdate } from "@/lib/update-jobs";

// Limite Vercel Hobby : 60 s. Le traitement s'arrête de lui-même avant (budget temps) ;
// les matchs restants sont repris au passage suivant.
// Les fonctions tournent à Londres (vercel.json → regions), comme la base Neon (eu-west-2).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * CRON quotidien — vercel.json : "0 8 * * *"
 *   Vercel planifie en UTC, sans changement d'heure :
 *   08:00 UTC = 09h00 Paris en heure d'hiver (fin oct. → fin mars), 10h00 en heure d'été.
 *   (Plan Hobby : déclenchement à un moment quelconque entre 08:00 et 08:59 UTC.)
 *   Le dernier match de la nuit (coup d'envoi 22h30 ET) finit vers 01h15 ET
 *   = 06:15 UTC en hiver → ~1h45 de marge, prolongations comprises.
 *
 * Contenu : src/lib/update-jobs.ts → runMorningUpdate (même tâche que le bouton
 * « Lancer la mise à jour » de l'admin). Chaque passage est enregistré dans l'historique
 * de l'admin ; e-mail aux administrateurs seulement si quelque chose reste à vérifier.
 *
 * Sécurité : header `Authorization: Bearer $CRON_SECRET` (envoyé automatiquement par Vercel).
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMorningUpdate(prisma, "cron");
  return NextResponse.json({ success: !result.fatal, ...result }, { status: result.fatal ? 500 : 200 });
}
