/**
 * Normalise les postes des joueurs en DB :
 *   PG, SG → G
 *   SF, PF → F
 *   C      → C  (inchangé)
 *
 * Usage : npm run db:normalize-positions
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("[POSITIONS] Normalisation des postes en DB...\n");

  // PG + SG → G
  const guards = await prisma.player.updateMany({
    where: { position: { in: ["PG", "SG"] } },
    data:  { position: "G" },
  });
  console.log(`  PG / SG → G : ${guards.count} joueurs`);

  // SF + PF → F
  const forwards = await prisma.player.updateMany({
    where: { position: { in: ["SF", "PF"] } },
    data:  { position: "F" },
  });
  console.log(`  SF / PF → F : ${forwards.count} joueurs`);

  // Vérification
  const byPos = await prisma.player.groupBy({
    by: ["position"],
    _count: { position: true },
    orderBy: { position: "asc" },
  });

  console.log("\n[POSITIONS] Répartition après normalisation :");
  for (const row of byPos) {
    console.log(`  ${row.position ?? "(null)"} : ${row._count.position} joueurs`);
  }

  console.log("\n[POSITIONS] Terminé.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
