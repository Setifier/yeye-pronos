"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";
import { getCurrentSeason } from "@/types/season";
import { AWARD_KEYS, type AwardKey } from "@/types/special-predictions";
import { gradeSeasonBetsJob } from "@/lib/update-jobs";

/** Enregistre (ou efface, playerId = null) le vainqueur d'un trophée, puis renote les paris de saison. */
export async function setAwardResultAction(award: AwardKey, playerId: string | null) {
  await assertAdmin();
  if (!(AWARD_KEYS as readonly string[]).includes(award)) throw new Error("Trophée inconnu");
  const season = getCurrentSeason();

  if (playerId) {
    const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } });
    if (!player) throw new Error("Joueur introuvable");
    await prisma.seasonAwardResult.upsert({
      where:  { season_award: { season, award } },
      create: { season, award, playerId },
      update: { playerId },
    });
  } else {
    await prisma.seasonAwardResult.deleteMany({ where: { season, award } });
  }

  const result = await gradeSeasonBetsJob(prisma, "admin");
  revalidatePath("/admin", "layout");
  revalidatePath("/pronos", "layout");
  return result;
}
