import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function deleteBadStats() {
  const gameId = "fc4dc070-9f0a-44ef-a1af-c42b0f3414c6";

  console.log("🗑️  Suppression des stats bugguées...");

  const result = await prisma.gamePlayerStats.deleteMany({
    where: { gameId },
  });

  console.log(`✅ ${result.count} stats supprimées`);

  await prisma.$disconnect();
}

deleteBadStats();
