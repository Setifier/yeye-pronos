import { PrismaClient, PredictionResult } from "@/generated/prisma";

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log("🔍 ÉTAT DE LA BASE DE DONNÉES\n");
  console.log("=".repeat(60));

  // 1. Matchs
  console.log("\n📊 MATCHS\n");

  const totalGames = await prisma.game.count();
  const finalGames = await prisma.game.count({ where: { status: "FINAL" } });
  const scheduledGames = await prisma.game.count({ where: { status: "SCHEDULED" } });
  const liveGames = await prisma.game.count({ where: { status: "LIVE" } });

  console.log(`Total matchs: ${totalGames}`);
  console.log(`  - FINAL: ${finalGames}`);
  console.log(`  - SCHEDULED: ${scheduledGames}`);
  console.log(`  - LIVE: ${liveGames}`);

  // Matchs par préfixe
  const allGames = await prisma.game.findMany({
    select: { externalId: true },
  });

  const prefixes = new Map<string, number>();
  for (const game of allGames) {
    const prefix = game.externalId.substring(0, 5);
    prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
  }

  console.log("\nMatchs par préfixe d'ID:");
  for (const [prefix, count] of Array.from(prefixes.entries()).sort()) {
    const type = prefix.startsWith("4") ? "ESPN ✅" : "BallDontLie ❌";
    console.log(`  ${prefix}*: ${count} matchs (${type})`);
  }

  // 2. Stats joueurs
  console.log("\n=".repeat(60));
  console.log("\n📊 STATS JOUEURS (GamePlayerStats)\n");

  const totalPlayerStats = await prisma.gamePlayerStats.count();
  console.log(`Total stats: ${totalPlayerStats}`);

  const gamesWithStats = await prisma.game.count({
    where: {
      playerStats: {
        some: {},
      },
    },
  });

  const finalGamesWithStats = await prisma.game.count({
    where: {
      status: "FINAL",
      playerStats: {
        some: {},
      },
    },
  });

  const finalGamesWithoutStats = await prisma.game.count({
    where: {
      status: "FINAL",
      playerStats: {
        none: {},
      },
    },
  });

  console.log(`Matchs avec stats: ${gamesWithStats}`);
  console.log(`Matchs FINAL avec stats: ${finalGamesWithStats}`);
  console.log(`Matchs FINAL SANS stats: ${finalGamesWithoutStats}`);

  const gamesWithTopScorer = await prisma.game.count({
    where: {
      topScorerId: { not: null },
    },
  });

  console.log(`Matchs avec top scorer: ${gamesWithTopScorer}`);

  // 3. Stats d'équipes
  console.log("\n=".repeat(60));
  console.log("\n📊 STATS ÉQUIPES (TeamSeasonStats)\n");

  const totalTeamStats = await prisma.teamSeasonStats.count();
  console.log(`Total stats équipes: ${totalTeamStats}`);

  if (totalTeamStats > 0) {
    const teamsWithStats = await prisma.teamSeasonStats.findMany({
      include: {
        team: { select: { abbreviation: true } },
      },
      take: 5,
    });

    console.log("\nExemples (5 premières équipes):");
    for (const stat of teamsWithStats) {
      console.log(`  ${stat.team.abbreviation}: ${stat.wins}W-${stat.losses}L, Streak: ${stat.currentStreak}`);
    }
  } else {
    console.log("⚠️  Aucune stat d'équipe trouvée !");
  }

  // 4. Stats moyennes joueurs
  console.log("\n=".repeat(60));
  console.log("\n📊 STATS MOYENNES JOUEURS (PlayerSeasonStats)\n");

  const totalPlayerSeasonStats = await prisma.playerSeasonStats.count();
  console.log(`Total stats saison: ${totalPlayerSeasonStats}`);

  if (totalPlayerSeasonStats > 0) {
    const topScorers = await prisma.playerSeasonStats.findMany({
      where: {
        gamesPlayed: { gt: 5 },
      },
      include: {
        player: { select: { fullName: true } },
      },
      orderBy: {
        pointsPerGame: "desc",
      },
      take: 5,
    });

    console.log("\nTop 5 scorers (min 5 matchs):");
    for (const stat of topScorers) {
      console.log(`  ${stat.player.fullName}: ${stat.pointsPerGame.toFixed(1)} PPG (${stat.gamesPlayed} matchs)`);
    }
  } else {
    console.log("⚠️  Aucune stat moyenne joueur trouvée !");
  }

  // 5. Pronos
  console.log("\n=".repeat(60));
  console.log("\n📊 PRONOSTICS\n");

  const totalPredictions = await prisma.prediction.count();
  const evaluatedPredictions = await prisma.prediction.count({
    where: {
      result: {
        in: [PredictionResult.WON, PredictionResult.LOST]
      }
    },
  });

  console.log(`Total pronos: ${totalPredictions}`);
  console.log(`Pronos évalués: ${evaluatedPredictions}`);
  console.log(`Pronos en attente: ${totalPredictions - evaluatedPredictions}`);

  // 6. Problèmes détectés
  console.log("\n=".repeat(60));
  console.log("\n⚠️  PROBLÈMES DÉTECTÉS\n");

  const issues: string[] = [];

  // Matchs BallDontLie résiduels
  const bdlCount = await prisma.game.count({
    where: {
      OR: [
        { externalId: { startsWith: "18446" } },
        { externalId: { startsWith: "18447" } },
        { externalId: { startsWith: "20054" } },
        { externalId: { startsWith: "20290" } },
        { externalId: { startsWith: "20314" } },
        { externalId: { startsWith: "20377" } },
      ],
    },
  });

  if (bdlCount > 0) {
    issues.push(`${bdlCount} matchs BallDontLie résiduels à supprimer`);
  }

  // Matchs FINAL sans stats
  if (finalGamesWithoutStats > 0) {
    issues.push(`${finalGamesWithoutStats} matchs FINAL sans stats joueurs`);
  }

  // Stats équipes manquantes
  if (totalTeamStats === 0) {
    issues.push(`Stats d'équipes manquantes (TeamSeasonStats vide)`);
  }

  // Stats moyennes joueurs manquantes
  if (totalPlayerSeasonStats === 0) {
    issues.push(`Stats moyennes joueurs manquantes (PlayerSeasonStats vide)`);
  }

  if (issues.length === 0) {
    console.log("✅ Aucun problème détecté !");
  } else {
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ❌ ${issue}`);
    });
  }

  console.log("\n=".repeat(60));

  await prisma.$disconnect();
}

checkDatabaseStatus();
