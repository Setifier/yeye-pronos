import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function cleanAllStats() {
  console.log("🗑️  Suppression de TOUTES les stats...\n");

  const result = await prisma.gamePlayerStats.deleteMany({});

  console.log(`✅ ${result.count} stats supprimées`);

  // Reset aussi les infos bonus des matchs
  const gamesReset = await prisma.game.updateMany({
    where: {
      topScorerId: { not: null },
    },
    data: {
      topScorerId: null,
      topScorerPoints: null,
      scoreMarginCategory: null,
      actualScoreMargin: null,
    },
  });

  console.log(`🔄 ${gamesReset.count} matchs réinitialisés (bonus info removed)`);

  await prisma.$disconnect();
}

cleanAllStats();
