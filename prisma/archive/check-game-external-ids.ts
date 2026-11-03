import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function checkExternalIds() {
  console.log("🔍 Vérification des externalId des matchs...\n");

  // Prendre quelques matchs récents
  const recentGames = await prisma.game.findMany({
    take: 10,
    orderBy: { gameDate: "desc" },
    include: {
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  });

  console.log("📊 10 matchs les plus récents :\n");
  for (const game of recentGames) {
    console.log(`Match: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
    console.log(`  Date: ${game.gameDate.toISOString()}`);
    console.log(`  externalId: ${game.externalId}`);
    console.log(`  Status: ${game.status}`);
    console.log("");
  }

  // Compter les matchs par préfixe d'ID
  const allGames = await prisma.game.findMany({
    select: { externalId: true },
  });

  console.log(`\n📊 Total matchs en DB: ${allGames.length}`);

  // Analyser les préfixes d'ID
  const prefixes = new Map<string, number>();
  for (const game of allGames) {
    const prefix = game.externalId.substring(0, 5);
    prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
  }

  console.log("\n📊 Préfixes d'externalId:");
  for (const [prefix, count] of prefixes.entries()) {
    console.log(`  ${prefix}*: ${count} matchs`);
  }

  // Détecter les doublons potentiels créés récemment
  const duplicates = await prisma.game.groupBy({
    by: ["homeTeamId", "awayTeamId", "gameDate"],
    having: {
      homeTeamId: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: true,
  });

  if (duplicates.length > 0) {
    console.log(`\n⚠️  ${duplicates.length} doublons détectés !`);

    for (const dup of duplicates.slice(0, 5)) {
      const games = await prisma.game.findMany({
        where: {
          homeTeamId: dup.homeTeamId,
          awayTeamId: dup.awayTeamId,
          gameDate: dup.gameDate,
        },
        include: {
          homeTeam: { select: { abbreviation: true } },
          awayTeam: { select: { abbreviation: true } },
        },
      });

      console.log(`\nDoublon: ${games[0].awayTeam.abbreviation} @ ${games[0].homeTeam.abbreviation}`);
      for (const game of games) {
        console.log(`  - ID: ${game.id}, externalId: ${game.externalId}, créé: ${game.createdAt.toISOString()}`);
      }
    }
  } else {
    console.log("\n✅ Aucun doublon détecté");
  }

  await prisma.$disconnect();
}

checkExternalIds();
