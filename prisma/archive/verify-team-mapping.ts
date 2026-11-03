import { PrismaClient } from "@/generated/prisma";
import { fetchTodaysGames } from "@/lib/espn";

const prisma = new PrismaClient();

/**
 * Vérifier que le mapping équipes ESPN ↔ DB fonctionne correctement
 */
async function verifyTeamMapping() {
  console.log("🔍 Vérification du mapping équipes ESPN ↔ DB...\n");

  // 1. Récupérer les équipes de la DB
  const dbTeams = await prisma.team.findMany({
    select: {
      id: true,
      externalId: true,
      abbreviation: true,
      name: true,
      city: true,
    },
  });

  console.log(`📊 ${dbTeams.length} équipes en DB\n`);

  // 2. Récupérer un jour de matchs depuis ESPN pour voir les IDs
  const testDate = "2026-01-09"; // Date récente avec matchs
  console.log(`📅 Test avec les matchs du ${testDate}...\n`);

  try {
    const espnGames = await fetchTodaysGames(testDate);
    console.log(`📊 ${espnGames.length} matchs trouvés sur ESPN\n`);

    if (espnGames.length === 0) {
      console.log("⚠️  Aucun match ce jour, impossible de tester");
      await prisma.$disconnect();
      return;
    }

    // Créer le mapping
    const teamMap = new Map(dbTeams.map((t) => [t.externalId, t]));

    console.log("🔍 Vérification du mapping pour chaque équipe:\n");

    const espnTeams = new Set<string>();
    let matchingTeams = 0;
    let missingTeams = 0;

    for (const game of espnGames) {
      // Home team
      if (!espnTeams.has(game.home_team.id)) {
        espnTeams.add(game.home_team.id);

        const dbTeam = teamMap.get(String(game.home_team.id));
        if (dbTeam) {
          console.log(`✅ ${game.home_team.abbreviation} (ESPN ID: ${game.home_team.id})`);
          console.log(`   → DB: ${dbTeam.abbreviation} (${dbTeam.city} ${dbTeam.name})`);
          if (game.home_team.abbreviation !== dbTeam.abbreviation) {
            console.log(`   ⚠️  Abbreviation différente: ESPN="${game.home_team.abbreviation}" vs DB="${dbTeam.abbreviation}"`);
          }
          matchingTeams++;
        } else {
          console.log(`❌ ${game.home_team.abbreviation} (ESPN ID: ${game.home_team.id})`);
          console.log(`   → PAS TROUVÉ EN DB !`);
          missingTeams++;
        }
        console.log("");
      }

      // Away team
      if (!espnTeams.has(game.visitor_team.id)) {
        espnTeams.add(game.visitor_team.id);

        const dbTeam = teamMap.get(String(game.visitor_team.id));
        if (dbTeam) {
          console.log(`✅ ${game.visitor_team.abbreviation} (ESPN ID: ${game.visitor_team.id})`);
          console.log(`   → DB: ${dbTeam.abbreviation} (${dbTeam.city} ${dbTeam.name})`);
          if (game.visitor_team.abbreviation !== dbTeam.abbreviation) {
            console.log(`   ⚠️  Abbreviation différente: ESPN="${game.visitor_team.abbreviation}" vs DB="${dbTeam.abbreviation}"`);
          }
          matchingTeams++;
        } else {
          console.log(`❌ ${game.visitor_team.abbreviation} (ESPN ID: ${game.visitor_team.id})`);
          console.log(`   → PAS TROUVÉ EN DB !`);
          missingTeams++;
        }
        console.log("");
      }
    }

    console.log("=".repeat(60));
    console.log("📊 RÉSUMÉ");
    console.log("=".repeat(60));
    console.log(`✅ Équipes matchées: ${matchingTeams}`);
    console.log(`❌ Équipes manquantes: ${missingTeams}`);

    if (missingTeams > 0) {
      console.log("\n⚠️  ATTENTION: Certaines équipes ESPN ne sont pas en DB !");
      console.log("Le script sync risque de skipper des matchs.");
    } else {
      console.log("\n✅ Tous les mappings sont corrects !");
      console.log("Le script sync peut être lancé en toute sécurité.");
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
  }

  await prisma.$disconnect();
}

verifyTeamMapping();
