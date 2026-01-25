/**
 * Script de backfill pour récupérer les stats de TOUS les matchs FINAL
 *
 * Ce script parcourt tous les matchs terminés et récupère leurs stats depuis ESPN
 * Usage: npx tsx prisma/backfill-game-stats.ts
 *
 * Options:
 * - --limit=N : Limiter à N matchs (pour test)
 * - --from=YYYY-MM-DD : Commencer à partir de cette date
 * - --to=YYYY-MM-DD : Jusqu'à cette date
 */

import { PrismaClient } from "../src/generated/prisma";
import { fetchAndSaveGameStats, delay } from "../src/lib/espn-stats";
import { getScoreMarginCategory } from "../src/types/bonus";

const prisma = new PrismaClient();

// Parse des arguments
const args = process.argv.slice(2);
const options = {
  limit: null as number | null,
  from: null as Date | null,
  to: null as Date | null,
};

for (const arg of args) {
  if (arg.startsWith("--limit=")) {
    options.limit = parseInt(arg.split("=")[1]);
  } else if (arg.startsWith("--from=")) {
    options.from = new Date(arg.split("=")[1]);
  } else if (arg.startsWith("--to=")) {
    options.to = new Date(arg.split("=")[1]);
  }
}

async function backfillGameStats() {
  console.log("🏀 Backfill Game Stats - Récupération historique\n");

  try {
    // 1. Récupérer tous les matchs FINAL
    const whereClause: any = {
      status: "FINAL",
    };

    if (options.from) {
      whereClause.gameDate = { gte: options.from };
    }

    if (options.to) {
      whereClause.gameDate = {
        ...whereClause.gameDate,
        lte: options.to,
      };
    }

    const finalGames = await prisma.game.findMany({
      where: whereClause,
      include: {
        homeTeam: true,
        awayTeam: true,
        playerStats: true, // Pour vérifier si déjà récupéré
      },
      orderBy: {
        gameDate: "desc", // Plus récent en premier
      },
      ...(options.limit && { take: options.limit }),
    });

    console.log(`📊 Matchs FINAL trouvés: ${finalGames.length}`);

    if (options.limit) {
      console.log(`⚠️  Limite: ${options.limit} matchs (mode test)`);
    }

    if (options.from) {
      console.log(`📅 Depuis: ${options.from.toISOString().split("T")[0]}`);
    }

    if (options.to) {
      console.log(`📅 Jusqu'à: ${options.to.toISOString().split("T")[0]}`);
    }

    console.log("");

    // 2. Statistiques
    let processed = 0;
    let success = 0;
    let skipped = 0;
    let errors = 0;
    let gamesWithStats = 0;

    // 3. Parcourir chaque match
    for (const game of finalGames) {
      processed++;

      // Vérifier si les stats sont déjà en DB
      const hasStats = game.playerStats.length > 0;

      if (hasStats) {
        skipped++;
        console.log(
          `[${processed}/${finalGames.length}] ⏭️  Skipping ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (${game.gameDate.toISOString().split("T")[0]}) - Stats déjà présentes (${game.playerStats.length} joueurs)`
        );
        continue;
      }

      console.log(
        `[${processed}/${finalGames.length}] 🔄 Processing ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (${game.gameDate.toISOString().split("T")[0]})...`
      );

      try {
        // Récupérer et sauvegarder les stats
        const topScorer = await fetchAndSaveGameStats(game.externalId, game.id);

        if (topScorer) {
          // Calculer le score margin
          if (game.homeScore !== null && game.awayScore !== null) {
            const actualMargin = Math.abs(game.homeScore - game.awayScore);
            const hasOvertime = (game.currentPeriod ?? 0) > 4;
            const scoreMarginCategory = getScoreMarginCategory(
              game.homeScore,
              game.awayScore,
              hasOvertime
            );

            // Mettre à jour le Game avec les infos bonus
            await prisma.game.update({
              where: { id: game.id },
              data: {
                topScorerId: topScorer.playerId,
                topScorerPoints: topScorer.points,
                actualScoreMargin: actualMargin,
                scoreMarginCategory,
                hasOvertime,
              },
            });
          }

          console.log(`   ✅ Top scorer: ${topScorer.playerName} (${topScorer.points} pts)`);
          success++;
          gamesWithStats++;
        } else {
          console.log(`   ⚠️  Pas de stats disponibles (match trop ancien ou API)`);
          success++; // Compté comme succès même sans stats
        }

        // Rate limiting (1 seconde entre chaque appel)
        await delay(1000);
      } catch (error) {
        console.error(`   ❌ Erreur:`, error instanceof Error ? error.message : error);
        errors++;

        // Si erreur 429 (rate limit), attendre plus longtemps
        if (error instanceof Error && error.message.includes("429")) {
          console.log(`   ⏳ Rate limit atteint, pause de 10 secondes...`);
          await delay(10000);
        } else {
          // Petit délai quand même
          await delay(1000);
        }
      }

      // Log de progression tous les 10 matchs
      if (processed % 10 === 0) {
        console.log(
          `\n📊 Progression: ${processed}/${finalGames.length} (${Math.round((processed / finalGames.length) * 100)}%)\n`
        );
      }
    }

    // 4. Résumé final
    console.log("\n" + "=".repeat(60));
    console.log("✅ BACKFILL TERMINÉ !");
    console.log("=".repeat(60));
    console.log(`📊 Matchs traités:        ${processed}`);
    console.log(`✅ Succès:                ${success}`);
    console.log(`📈 Stats récupérées:      ${gamesWithStats}`);
    console.log(`⏭️  Déjà présentes:        ${skipped}`);
    console.log(`❌ Erreurs:               ${errors}`);
    console.log("=".repeat(60));

    // 5. Vérification finale
    const totalStatsInDB = await prisma.gamePlayerStats.count();
    console.log(`\n📊 Total GamePlayerStats en DB: ${totalStatsInDB}`);

    const gamesWithTopScorer = await prisma.game.count({
      where: {
        status: "FINAL",
        topScorerId: { not: null },
      },
    });

    console.log(`🏆 Matchs avec top scorer: ${gamesWithTopScorer}`);
  } catch (error) {
    console.error("\n❌ Erreur fatale durant le backfill:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Lancer le backfill
console.log("🚀 Démarrage du backfill...\n");
console.log("Options:");
console.log(`  --limit=N        : Limiter à N matchs (pour test)`);
console.log(`  --from=YYYY-MM-DD: Commencer à partir de cette date`);
console.log(`  --to=YYYY-MM-DD  : Jusqu'à cette date`);
console.log("\nExemples:");
console.log(`  npx tsx prisma/backfill-game-stats.ts --limit=5`);
console.log(`  npx tsx prisma/backfill-game-stats.ts --from=2025-12-01`);
console.log(`  npx tsx prisma/backfill-game-stats.ts --from=2025-12-01 --to=2025-12-31`);
console.log("");

backfillGameStats()
  .then(() => {
    console.log("\n✅ Script terminé avec succès !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script échoué:", error);
    process.exit(1);
  });
