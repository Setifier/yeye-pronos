/**
 * Script pour vider la table players (supprime les données obsolètes)
 * Usage: npx tsx prisma/clear-players.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Suppression de tous les joueurs obsolètes...\n");

  const result = await prisma.player.deleteMany({});

  console.log(`✅ ${result.count} joueurs supprimés\n`);
  console.log("Base de données nettoyée ! ✨\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
