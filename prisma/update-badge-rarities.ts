/**
 * Script pour mettre à jour les raretés des badges selon la logique de difficulté
 * Usage: npx tsx prisma/update-badge-rarities.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// Mapping slug -> nouvelle rareté
const rarityUpdates: { [slug: string]: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" } = {
  // SEASON - Victoires
  "le-wilt": "RARE", // 100 pronos : COMMON → RARE

  // SEASON - Séries
  "chef-curry": "EPIC", // 15 consécutifs : RARE → EPIC
  "cheat-code": "LEGENDARY", // 25 consécutifs : EPIC → LEGENDARY

  // SEASON - Tanking
  "du-bon-vieux-tanking": "COMMON", // 8 matchs 0% : RARE → COMMON

  // SEASON - Weekly/Monthly
  "le-mois-de-legende": "LEGENDARY", // 80% sur mois : EPIC → LEGENDARY

  // END_SEASON - Winrate saison
  "maitre-de-la-precision": "LEGENDARY", // 80% saison : EPIC → LEGENDARY

  // END_SEASON - Winrate équipe favorite
  "voyance-fan-ultime": "LEGENDARY", // 80% favorite : EPIC → LEGENDARY

  // CAREER - Victoires totales
  "centurion": "COMMON", // 100 pronos : LEGENDARY → COMMON
  "stratege-confirme": "RARE", // 250 pronos : LEGENDARY → RARE
  "maitre-pronostiqueur": "RARE", // 500 pronos : LEGENDARY → RARE
  "legende-vivante": "EPIC", // 1000 pronos : LEGENDARY → EPIC
  "dieu-du-basket": "LEGENDARY", // 5000 pronos : EPIC → LEGENDARY
  "limmortel": "LEGENDARY", // 10000 pronos : RARE → LEGENDARY

  // CAREER - Compétitions publiques
  "vainqueur-public": "RARE", // 1 victoire : EPIC → RARE
  "dominateur-public": "EPIC", // 3 victoires : RARE → EPIC
  "empereur-public": "EPIC", // 10 victoires : COMMON → EPIC
  "dynastie-publique": "LEGENDARY", // 25 victoires : EPIC → LEGENDARY

  // CAREER - Compétitions privées
  "champion-prive": "RARE", // 1 victoire : EPIC → RARE
  "seigneur-des-ligues": "LEGENDARY", // 25 victoires : EPIC → LEGENDARY

  // CAREER - Saisons participées
  "pilier-de-la-communaute": "EPIC", // 10 saisons : COMMON → EPIC
  "ancetre-fondateur": "LEGENDARY", // 25 saisons : EPIC → LEGENDARY
};

async function main() {
  console.log("🔄 Mise à jour des raretés des badges\n");
  console.log(`📊 Badges à mettre à jour : ${Object.keys(rarityUpdates).length}\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const [slug, newRarity] of Object.entries(rarityUpdates)) {
    try {
      // Vérifier si le badge existe
      const badge = await prisma.badge.findUnique({
        where: { slug },
      });

      if (!badge) {
        console.log(`⚠️  Badge non trouvé : ${slug}`);
        notFound++;
        continue;
      }

      // Mettre à jour la rareté
      await prisma.badge.update({
        where: { slug },
        data: { rarity: newRarity },
      });

      updated++;
      console.log(`✅ ${badge.name} : ${badge.rarity} → ${newRarity}`);
    } catch (error) {
      console.error(`❌ Erreur pour ${slug}:`, error);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Résumé :`);
  console.log(`   ✅ Badges mis à jour : ${updated}`);
  console.log(`   ⚠️  Badges non trouvés : ${notFound}`);
  console.log(`   ❌ Erreurs : ${errors}`);
  console.log("=".repeat(60) + "\n");

  // Statistiques par rareté après update
  const rarityStats = await prisma.badge.groupBy({
    by: ["rarity"],
    _count: true,
  });

  console.log("📊 Répartition par rareté (après update) :");
  rarityStats.forEach((stat) => {
    console.log(`   ${stat.rarity}: ${stat._count} badges`);
  });
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
