/**
 * Backfill des stats de boxscore manquantes (offensiveRebounds, defensiveRebounds, personalFouls)
 *
 * Ce script re-fetche les boxscores ESPN pour tous les matchs FINAL de saison régulière
 * et met à jour uniquement les stats de GamePlayerStats, sans toucher aux pronos ni standings.
 *
 * À lancer UNE FOIS après avoir ajouté offensiveRebounds, defensiveRebounds et personalFouls
 * dans le schéma GamePlayerStats.
 *
 * Suivi du progrès : peut être interrompu et relancé, il saute les matchs déjà complets.
 *
 * Usage :
 *   npm run db:backfill-boxscore-stats
 *   npm run db:backfill-boxscore-stats -- --force   (re-fetch même les matchs déjà complets)
 */

import { prisma } from "../src/lib/prisma";
import { fetchAndSaveGameStats } from "../src/lib/espn-stats";
import { recalculateAllPlayerStats } from "../src/lib/calculate-player-season-stats";
import { getCurrentSeason } from "../src/types/season";

const DELAY_MS = 600;
const BATCH_LOG = 25; // Log tous les N matchs

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const season = args.find((a) => a.startsWith("--season="))?.split("=")[1] ?? getCurrentSeason();
  const force  = args.includes("--force");

  console.log("═".repeat(60));
  console.log("🏀 BACKFILL BOXSCORE STATS (REBO / REBD / FP)");
  console.log("═".repeat(60));
  console.log(`📅 Saison : ${season}`);
  console.log(`🔄 Mode   : ${force ? "FORCE (re-fetch tout)" : "Smart (matchs incomplets uniquement)"}`);
  console.log("═".repeat(60));

  // Trouver les matchs à traiter
  // En mode normal : uniquement les matchs où au moins un joueur a offensiveRebounds null
  // En mode --force : tous les matchs FINAL
  let gameIds: string[];

  if (force) {
    const games = await prisma.game.findMany({
      where: {
        season,
        status: "FINAL",
        seasonType: "Regular Season",
      },
      select: { id: true, externalId: true },
      orderBy: { gameDate: "asc" },
    });
    gameIds = games.map((g) => g.id);
    console.log(`\n🔍 Mode force : ${gameIds.length} matchs à traiter\n`);
  } else {
    // Matchs FINAL qui ont des GamePlayerStats avec offensiveRebounds null
    const gamesWithMissingStats = await prisma.gamePlayerStats.findMany({
      where: {
        offensiveRebounds: null,
        game: {
          season,
          status: "FINAL",
          seasonType: "Regular Season",
        },
      },
      select: { gameId: true },
      distinct: ["gameId"],
    });
    gameIds = gamesWithMissingStats.map((g) => g.gameId);
    console.log(`\n🔍 ${gameIds.length} matchs avec stats REBO/REBD manquantes\n`);
  }

  if (gameIds.length === 0) {
    console.log("✅ Rien à faire — tous les boxscores sont déjà complets.");
    console.log("\nLance npm run db:recalculate-player-stats pour recalculer les moyennes.");
    return;
  }

  // Récupérer externalId pour chaque game
  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    select: { id: true, externalId: true, gameDate: true },
    orderBy: { gameDate: "asc" },
  });

  let processed = 0;
  let errors    = 0;

  for (const game of games) {
    try {
      await fetchAndSaveGameStats(game.externalId, game.id);
      processed++;

      if (processed % BATCH_LOG === 0) {
        console.log(`  📦 Progression : ${processed}/${games.length} matchs traités (${errors} erreurs)`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Erreur game ${game.externalId}:`, err);
    }

    await delay(DELAY_MS);
  }

  console.log("\n" + "─".repeat(60));
  console.log(`✅ Boxscores : ${processed}/${games.length} traités, ${errors} erreurs`);
  console.log("─".repeat(60));

  // Recalculer toutes les moyennes joueurs
  console.log("\n📊 Recalcul des moyennes joueurs...\n");
  await recalculateAllPlayerStats(prisma);

  console.log("\n" + "═".repeat(60));
  console.log("✨ BACKFILL TERMINÉ !");
  console.log("═".repeat(60));
}

main()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Erreur fatale:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
