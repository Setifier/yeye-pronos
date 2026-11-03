/**
 * Mise à jour de l'infirmerie NBA
 *
 * Même logique que le CRON (src/lib/roster-sync.ts) :
 *   1. Rosters ESPN (rattache chaque joueur à la bonne équipe + statut de blessure)
 *   2. Endpoint /injuries ESPN (type, côté, nature, date de retour)
 *   3. Met à jour Player (isInjured, injuryStatus, injuryNote, injuryReturnDate) + InjuryReport
 *   4. Rétablit les joueurs absents des deux sources (si les sources sont fiables)
 *
 * Valable en saison régulière comme en postseason (les rosters ESPN restent à jour).
 *
 * Usage :
 *   npm run db:update-injuries
 */

import { prisma } from "../src/lib/prisma";
import { syncRostersAndInjuries } from "../src/lib/roster-sync";

async function main() {
  console.log("═".repeat(60));
  console.log("🏥  MISE À JOUR DES BLESSURES NBA");
  console.log("═".repeat(60));

  const { injuries } = await syncRostersAndInjuries(prisma, { log: (m) => console.log(m) });

  if (injuries.notFound.length > 0) {
    console.log(`\n❓ Joueurs blessés absents de la DB : ${injuries.notFound.join(", ")}`);
  }

  const list = await prisma.player.findMany({
    where:   { isInjured: true },
    select:  { fullName: true, injuryStatus: true, injuryNote: true, team: { select: { abbreviation: true } } },
    orderBy: [{ team: { abbreviation: "asc" } }, { fullName: "asc" }],
  });

  console.log(`\n📋  Infirmerie (${list.length}) :`);
  for (const p of list) {
    console.log(`   ${(p.team?.abbreviation ?? "FA").padEnd(4)} ${p.fullName.padEnd(26)} ${(p.injuryStatus ?? "").padEnd(11)} ${p.injuryNote ?? ""}`);
  }
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌ Erreur fatale :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
