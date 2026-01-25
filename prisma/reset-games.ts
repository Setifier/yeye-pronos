/**
 * Script pour supprimer tous les matchs de la base de données
 * À utiliser avant de relancer le seed avec les bonnes heures
 */

import { prisma } from "../src/lib/prisma";

async function resetGames() {
  console.log("🗑️  Suppression de tous les matchs...");

  const result = await prisma.game.deleteMany({});

  console.log(`✅ ${result.count} matchs supprimés`);
  console.log("✨ La base est prête pour un nouveau seed avec les vraies heures !");
}

resetGames()
  .then(() => {
    console.log("✅ Reset terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
