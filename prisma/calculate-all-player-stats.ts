/**
 * Script pour calculer les stats saison de TOUS les joueurs
 * À lancer une fois pour initialiser PlayerSeasonStats
 *
 * Usage: npx tsx prisma/calculate-all-player-stats.ts
 */

import { PrismaClient } from "@/generated/prisma";
import { recalculateAllPlayerStats } from "@/lib/calculate-player-season-stats";

const prisma = new PrismaClient();

async function main() {
  console.log("═".repeat(80));
  console.log("🏀 CALCUL DES STATS SAISON DE TOUS LES JOUEURS");
  console.log("═".repeat(80));
  console.log(`📅 Date : ${new Date().toLocaleString("fr-FR")}`);
  console.log(`🏆 Saison : 2025-26`);
  console.log("═".repeat(80));

  try {
    await recalculateAllPlayerStats(prisma);

    console.log("\n" + "═".repeat(80));
    console.log("✅ CALCUL TERMINÉ AVEC SUCCÈS !");
    console.log("═".repeat(80));

    // Vérification finale
    const totalPlayerStats = await prisma.playerSeasonStats.count();
    console.log(`\n📊 Total stats joueurs créées: ${totalPlayerStats}`);

    // Quelques exemples
    const topScorers = await prisma.playerSeasonStats.findMany({
      where: {
        gamesPlayed: { gte: 5 }, // Min 5 matchs
      },
      include: {
        player: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        pointsPerGame: "desc",
      },
      take: 10,
    });

    console.log("\n🏆 Top 10 Scorers (min 5 matchs):");
    topScorers.forEach((stat, idx) => {
      console.log(
        `  ${idx + 1}. ${stat.player.fullName}: ${stat.pointsPerGame.toFixed(1)} PPG (${stat.gamesPlayed} GP)`
      );
    });
  } catch (error) {
    console.error("\n❌ Erreur:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("\n✅ Script terminé avec succès !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script échoué:", error);
    process.exit(1);
  });
