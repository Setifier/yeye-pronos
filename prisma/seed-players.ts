/**
 * Seed initial des joueurs NBA.
 *
 * Alias de `npm run db:update-rosters` (src/lib/roster-sync.ts) : l'ancienne version
 * associait les équipes par `Team.externalId`, qui ne correspond pas toujours aux IDs
 * ESPN du roster. La synchro par abréviation est fiable.
 *
 * Usage :
 *   npm run db:seed-players
 */

import { prisma } from "../src/lib/prisma";
import { syncRostersAndInjuries } from "../src/lib/roster-sync";

syncRostersAndInjuries(prisma, { log: (m) => console.log(m) })
  .then(async () => {
    console.log(`\n📊 ${await prisma.player.count({ where: { teamId: { not: null } } })} joueurs sous contrat`);
    process.exit(0);
  })
  .catch((err) => { console.error("❌ Erreur fatale :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
