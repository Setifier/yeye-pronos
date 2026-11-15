"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Entraîneur de l'année d'une saison (ESPN ne le publie pas) : enregistré dans NbaAward (source « ADMIN »).
 * `name` vide = effacer.
 */
export async function setCoachOfYearAction(season: string, name: string, teamAbbr: string | null): Promise<Result> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!/^\d{4}-\d{2}$/.test(season)) return { ok: false, error: "Saison invalide." };

  const clean = name.trim().replace(/\s+/g, " ");
  try {
    if (!clean) {
      await prisma.nbaAward.deleteMany({ where: { season, award: "COY" } });
    } else {
      if (clean.length < 3 || clean.length > 60) return { ok: false, error: "Nom de l'entraîneur trop court ou trop long." };
      if (teamAbbr && !(await prisma.team.findUnique({ where: { abbreviation: teamAbbr }, select: { id: true } }))) {
        return { ok: false, error: "Équipe inconnue." };
      }
      const data = { name: clean, teamAbbr: teamAbbr || null, source: "ADMIN", headshot: null, espnAthleteId: null, playerId: null };
      await prisma.nbaAward.upsert({
        where:  { season_award_rank: { season, award: "COY", rank: 0 } },
        create: { season, award: "COY", rank: 0, ...data },
        update: data,
      });
    }
  } catch (err) {
    console.error("[setCoachOfYear]", err);
    return { ok: false, error: "Enregistrement impossible (table des trophées créée ? npx prisma db push)." };
  }

  revalidatePath("/trophees");
  revalidatePath("/archives", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
