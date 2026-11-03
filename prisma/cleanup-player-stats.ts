/**
 * Nettoyage et recalcul des stats joueurs
 *
 * Problème : les enregistrements GamePlayerStats des joueurs DNP (Did Not Play)
 * ont minutes = "0:00" ou null. Même si le calcul les filtre, ils polluent la DB
 * et peuvent provoquer des écarts si le recalcul n'a pas été relancé récemment.
 *
 * Ce script :
 * 1. Supprime tous les enregistrements GamePlayerStats avec minutes NULL ou "0:00"
 * 2. Supprime les joueurs créés automatiquement qui n'ont AUCUN match joué (fantômes ESPN)
 * 3. Recalcule toutes les stats saison (PlayerSeasonStats)
 *
 * Usage :
 *   npm run db:cleanup-player-stats
 */

import { prisma } from "../src/lib/prisma";
import { recalculateAllPlayerStats } from "../src/lib/calculate-player-season-stats";
import { getCurrentSeason } from "../src/types/season";

const CURRENT_SEASON = getCurrentSeason();

async function main() {
  console.log("═".repeat(60));
  console.log("🧹  NETTOYAGE DES STATS JOUEURS");
  console.log(`📅  Saison : ${CURRENT_SEASON}`);
  console.log("═".repeat(60));

  // ── 1. Compter avant ──────────────────────────────────────────
  const totalBefore = await prisma.gamePlayerStats.count({
    where: { game: { season: CURRENT_SEASON, seasonType: "Regular Season" } },
  });

  const dnpCount = await prisma.gamePlayerStats.count({
    where: {
      game: { season: CURRENT_SEASON, seasonType: "Regular Season" },
      OR: [{ minutes: null }, { minutes: "0:00" }],
    },
  });

  console.log(`\n📊 GamePlayerStats en saison régulière : ${totalBefore}`);
  console.log(`   dont DNP (minutes null ou "0:00")    : ${dnpCount}`);

  if (dnpCount === 0) {
    console.log("\n✅ Aucun enregistrement DNP — base déjà propre.");
  } else {
    // ── 2. Supprimer les DNP ─────────────────────────────────────
    console.log(`\n🗑️  Suppression de ${dnpCount} enregistrements DNP...`);

    const deleted = await prisma.gamePlayerStats.deleteMany({
      where: {
        game: { season: CURRENT_SEASON, seasonType: "Regular Season" },
        OR: [{ minutes: null }, { minutes: "0:00" }],
      },
    });

    console.log(`   ✅ ${deleted.count} enregistrements supprimés`);
  }

  // ── 3. Recalculer toutes les stats saison ─────────────────────
  console.log("\n📊  Recalcul de toutes les moyennes joueurs...");
  await recalculateAllPlayerStats(prisma);

  // ── 4. Résumé final ───────────────────────────────────────────
  const totalAfter = await prisma.gamePlayerStats.count({
    where: { game: { season: CURRENT_SEASON, seasonType: "Regular Season" } },
  });

  const statsCount = await prisma.playerSeasonStats.count({
    where: { season: CURRENT_SEASON },
  });

  // Top 5 par matchs joués pour vérifier
  const sample = await prisma.playerSeasonStats.findMany({
    where: { season: CURRENT_SEASON },
    select: {
      gamesPlayed: true,
      pointsPerGame: true,
      player: { select: { fullName: true } },
    },
    orderBy: { gamesPlayed: "desc" },
    take: 5,
  });

  console.log("\n" + "─".repeat(60));
  console.log(`📊  GamePlayerStats après nettoyage  : ${totalAfter}`);
  console.log(`    PlayerSeasonStats recalculées     : ${statsCount}`);
  console.log("\n🔍  Top 5 joueurs (max matchs joués) :");
  for (const s of sample) {
    console.log(
      `   ${s.player.fullName.padEnd(25)} → ${String(s.gamesPlayed).padStart(2)} MJ · ${s.pointsPerGame.toFixed(1)} pts`
    );
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅  Nettoyage et recalcul terminés.");
  console.log("   Vérifie les stats dans l'app — MJ doit maintenant être correct.");
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur fatale:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
