/**
 * Trophées NBA d'une saison depuis ESPN (MVP, DPOY, Rookie, All-NBA, NBA Cup, MVP des Finales…).
 *
 * Même tâche que le CRON de midi et le bouton de l'admin (src/lib/update-jobs.ts → runNbaAwardsUpdate),
 * sur la saison de son choix : sert à remplir les saisons passées (Archives → Trophées NBA).
 * Relançable sans risque : rien n'est réécrit si ESPN n'a pas changé.
 * L'entraîneur de l'année n'est pas publié par ESPN : Admin → Paris de saison → Trophées NBA.
 *
 * Usage :
 *   npm run db:sync-awards                       # saison en cours
 *   npm run db:sync-awards -- --season=2025-26   # une saison passée
 */

import { prisma } from "../src/lib/prisma";
import { runNbaAwardsUpdate } from "../src/lib/update-jobs";
import { NBA_AWARDS } from "../src/types/nba-awards";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--season="))?.split("=")[1];
  const season = arg ?? getCurrentSeason();
  if (!/^\d{4}-\d{2}$/.test(season)) throw new Error(`Saison invalide : ${season} (format 2025-26)`);

  console.log("═".repeat(60));
  console.log(`🏆  TROPHÉES NBA ${season}`);
  console.log("═".repeat(60));

  const result = await runNbaAwardsUpdate(prisma, "admin", season);
  if (result.problems.length) console.log(`\n⚠️  ${result.problems.join("\n⚠️  ")}`);

  const rows = await prisma.nbaAward.findMany({
    where:   { season },
    orderBy: [{ award: "asc" }, { rank: "asc" }],
    select:  { award: true, name: true, teamAbbr: true, playerId: true },
  });
  console.log(`\n📋  En base pour ${season} :`);
  for (const def of NBA_AWARDS) {
    const winners = rows.filter((r) => r.award === def.key);
    const list = winners.length
      ? winners.map((w) => `${w.name}${w.teamAbbr ? ` (${w.teamAbbr})` : ""}${w.playerId ? "" : " *"}`).join(", ")
      : def.espnId === null ? "— à saisir dans l'admin" : "— pas encore décerné";
    console.log(`   ${def.label.padEnd(30)} ${list}`);
  }
  console.log("\n   * hors de notre base : affiché sans lien vers une fiche");
  console.log("═".repeat(60));
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
