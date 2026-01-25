import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

/**
 * Script pour vider complètement les données NBA de la base
 * Permet de repartir à zéro avant de relancer le seed
 *
 * Usage: tsx prisma/reset-nba-data.ts
 */
async function resetNBAData() {
  console.log("🗑️  Suppression des données NBA...\n");

  try {
    // Supprimer dans l'ordre pour respecter les foreign keys
    console.log("1️⃣  Suppression des prédictions...");
    const deletedPredictions = await prisma.prediction.deleteMany({});
    console.log(`   ✅ ${deletedPredictions.count} prédictions supprimées`);

    console.log("\n2️⃣  Suppression des matchs...");
    const deletedGames = await prisma.game.deleteMany({});
    console.log(`   ✅ ${deletedGames.count} matchs supprimés`);

    console.log("\n3️⃣  Suppression des joueurs...");
    const deletedPlayers = await prisma.player.deleteMany({});
    console.log(`   ✅ ${deletedPlayers.count} joueurs supprimés`);

    console.log("\n4️⃣  Suppression des équipes...");
    const deletedTeams = await prisma.team.deleteMany({});
    console.log(`   ✅ ${deletedTeams.count} équipes supprimées`);

    console.log("\n✨ Toutes les données NBA ont été supprimées !");
    console.log("\n🚀 Vous pouvez maintenant relancer le seed :");
    console.log("   npm run db:seed");
  } catch (error) {
    console.error("\n❌ Erreur lors de la suppression :", error);
    throw error;
  }
}

resetNBAData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
