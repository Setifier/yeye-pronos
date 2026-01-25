/**
 * Script pour supprimer les équipes NON officielles NBA
 * Garde uniquement les 30 équipes de la saison 2025-26
 */

import { prisma } from "../src/lib/prisma";

async function cleanTeams() {
  console.log("🧹 Nettoyage des équipes NON officielles...\n");

  // Les 30 équipes NBA officielles 2025-26
  const OFFICIAL_30_TEAMS = [
    "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
    "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
    "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
  ];

  // Trouver les équipes à supprimer
  const teamsToDelete = await prisma.team.findMany({
    where: {
      abbreviation: {
        notIn: OFFICIAL_30_TEAMS,
      },
    },
    select: {
      id: true,
      abbreviation: true,
      name: true,
      city: true,
    },
  });

  if (teamsToDelete.length === 0) {
    console.log("✅ Aucune équipe à supprimer ! La DB est propre.");
    return;
  }

  console.log(`⚠️  ${teamsToDelete.length} équipes à supprimer :`);
  for (const team of teamsToDelete) {
    console.log(`  - ${team.abbreviation}: ${team.city} ${team.name}`);
  }

  console.log("\n🗑️  Suppression en cours...");

  const result = await prisma.team.deleteMany({
    where: {
      abbreviation: {
        notIn: OFFICIAL_30_TEAMS,
      },
    },
  });

  console.log(`✅ ${result.count} équipes supprimées`);
  console.log("✨ La DB ne contient plus que les 30 équipes NBA officielles !");
}

cleanTeams()
  .then(() => {
    console.log("\n✅ Nettoyage terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
