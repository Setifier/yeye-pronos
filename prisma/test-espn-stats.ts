/**
 * Script de test pour ESPN Stats
 *
 * Teste la récupération et sauvegarde des stats d'un match terminé
 * Usage: npx tsx prisma/test-espn-stats.ts
 */

import { PrismaClient } from "../src/generated/prisma";
import { fetchAndSaveGameStats } from "../src/lib/espn-stats";

const prisma = new PrismaClient();

async function testESPNStats() {
  console.log("🏀 Test ESPN Stats - Récupération et sauvegarde\n");

  try {
    // 1. Chercher un match FINAL récent dans notre DB
    const recentFinalGame = await prisma.game.findFirst({
      where: {
        status: "FINAL",
        gameDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        gameDate: "desc",
      },
    });

    if (!recentFinalGame) {
      console.log("❌ Aucun match terminé trouvé dans les 7 derniers jours");
      console.log("💡 Conseil: Lancez d'abord le CRON update-live-scores pour avoir des matchs FINAL");
      return;
    }

    console.log(`📊 Match trouvé:`);
    console.log(`   ${recentFinalGame.awayTeam.abbreviation} @ ${recentFinalGame.homeTeam.abbreviation}`);
    console.log(`   Score: ${recentFinalGame.awayScore} - ${recentFinalGame.homeScore}`);
    console.log(`   Date: ${recentFinalGame.gameDate.toISOString()}`);
    console.log(`   ESPN ID: ${recentFinalGame.externalId}`);
    console.log("");

    // 2. Tester la récupération et sauvegarde des stats
    console.log("🔄 Récupération des stats depuis ESPN...\n");

    const topScorer = await fetchAndSaveGameStats(
      recentFinalGame.externalId,
      recentFinalGame.id
    );

    if (!topScorer) {
      console.log("⚠️  Aucune stat récupérée (match trop ancien ou pas de boxscore ESPN)");
      return;
    }

    console.log("\n✅ Stats récupérées et sauvegardées avec succès !\n");
    console.log("🏆 Top Scorer:");
    console.log(`   Joueur: ${topScorer.playerName}`);
    console.log(`   Points: ${topScorer.points}`);
    console.log(`   Player ID (DB): ${topScorer.playerId}`);
    console.log(`   ESPN Player ID: ${topScorer.espnPlayerId}`);

    // 3. Vérifier que les stats sont bien en DB
    const savedStats = await prisma.gamePlayerStats.count({
      where: { gameId: recentFinalGame.id },
    });

    console.log(`\n📈 Statistiques sauvegardées:`);
    console.log(`   ${savedStats} joueurs dans GamePlayerStats`);

    // 4. Afficher quelques stats du top scorer
    const topScorerStats = await prisma.gamePlayerStats.findFirst({
      where: {
        gameId: recentFinalGame.id,
        playerId: topScorer.playerId,
      },
      include: {
        player: true,
      },
    });

    if (topScorerStats) {
      console.log(`\n📊 Détails stats de ${topScorerStats.player.fullName}:`);
      console.log(`   Points: ${topScorerStats.points}`);
      console.log(`   Rebounds: ${topScorerStats.rebounds ?? "N/A"}`);
      console.log(`   Assists: ${topScorerStats.assists ?? "N/A"}`);
      console.log(`   Steals: ${topScorerStats.steals ?? "N/A"}`);
      console.log(`   Blocks: ${topScorerStats.blocks ?? "N/A"}`);
      console.log(`   FG: ${topScorerStats.fieldGoalsMade ?? "?"}/${topScorerStats.fieldGoalsAttempted ?? "?"}`);
      console.log(`   3PT: ${topScorerStats.threePointersMade ?? "?"}/${topScorerStats.threePointersAttempted ?? "?"}`);
      console.log(`   FT: ${topScorerStats.freeThrowsMade ?? "?"}/${topScorerStats.freeThrowsAttempted ?? "?"}`);
      console.log(`   +/-: ${topScorerStats.plusMinus ?? "N/A"}`);
      console.log(`   Minutes: ${topScorerStats.minutes ?? "N/A"}`);
    }

    // 5. Test de la mise à jour du Game avec topScorerId
    console.log(`\n🔄 Mise à jour du match avec le top scorer...`);

    await prisma.game.update({
      where: { id: recentFinalGame.id },
      data: {
        topScorerId: topScorer.playerId,
        topScorerPoints: topScorer.points,
      },
    });

    console.log(`✅ Match mis à jour avec topScorerId`);

    // 6. Vérifier
    const updatedGame = await prisma.game.findUnique({
      where: { id: recentFinalGame.id },
      include: {
        topScorer: true,
      },
    });

    if (updatedGame?.topScorer) {
      console.log(`\n🏆 Top scorer enregistré dans le match:`);
      console.log(`   ${updatedGame.topScorer.fullName} - ${updatedGame.topScorerPoints} points`);
    }

    console.log("\n✅ Test terminé avec succès ! 🎉");
    console.log("\n💡 Le système est prêt à être intégré au CRON update-live-scores");
  } catch (error) {
    console.error("\n❌ Erreur durant le test:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Lancer le test
testESPNStats()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
