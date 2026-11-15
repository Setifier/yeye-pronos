/**
 * Lecture des trophées NBA d'une saison (serveur). Écriture : src/lib/nba-awards-sync.ts (ESPN)
 * et l'action de l'admin pour l'entraîneur de l'année.
 */

import type { PrismaClient } from "@/generated/prisma";
import type { NbaAwardWinner } from "@/types/nba-awards";

/** Lauréats de la saison, triés par trophée puis rang. Liste vide si la table n'existe pas encore. */
export async function getSeasonNbaAwards(prisma: PrismaClient, season: string): Promise<NbaAwardWinner[]> {
  try {
    return await prisma.nbaAward.findMany({
      where:   { season },
      orderBy: [{ award: "asc" }, { rank: "asc" }],
      select:  { award: true, rank: true, name: true, teamAbbr: true, headshot: true, playerId: true, source: true },
    });
  } catch (err) {
    // Table pas encore créée (npx prisma db push) : la page s'affiche avec « À venir »
    console.error("[nba-awards]", err instanceof Error ? err.message : err);
    return [];
  }
}
