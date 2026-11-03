import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function checkSeasonFormats() {
  console.log("🔍 VÉRIFICATION DES FORMATS DE SAISON\n");
  console.log("=".repeat(60));

  // Games
  const games = await prisma.game.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "asc" },
  });

  console.log("\n📊 FORMATS DANS Game:");
  games.forEach((g) => {
    const count = prisma.game.count({ where: { season: g.season } });
    console.log(`  - "${g.season}"`);
  });

  // TeamSeasonStats
  const teamStats = await prisma.teamSeasonStats.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "asc" },
  });

  console.log("\n📊 FORMATS DANS TeamSeasonStats:");
  for (const ts of teamStats) {
    const count = await prisma.teamSeasonStats.count({
      where: { season: ts.season },
    });
    console.log(`  - "${ts.season}" (${count} records)`);
  }

  // PlayerSeasonStats
  const playerStats = await prisma.playerSeasonStats.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "asc" },
  });

  console.log("\n📊 FORMATS DANS PlayerSeasonStats:");
  if (playerStats.length === 0) {
    console.log("  - (vide)");
  } else {
    for (const ps of playerStats) {
      const count = await prisma.playerSeasonStats.count({
        where: { season: ps.season },
      });
      console.log(`  - "${ps.season}" (${count} records)`);
    }
  }

  console.log("\n=".repeat(60));
  console.log("✅ Vérification terminée");

  await prisma.$disconnect();
}

checkSeasonFormats();
