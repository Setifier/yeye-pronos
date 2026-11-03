/**
 * SCRIPT DE DEBUG - Analyse des APIs NBA
 *
 * Ce script va interroger les vraies APIs et afficher
 * la structure EXACTE des données pour comprendre le mapping
 */

import { PrismaClient } from "../src/generated/prisma/index.js";
import fs from "fs";

const prisma = new PrismaClient();

// ============================================
// 1. DEBUG ESPN STANDINGS
// ============================================

async function debugESPNStandings() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DEBUG ESPN STANDINGS");
  console.log("=".repeat(60));

  try {
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/standings";
    console.log(`\n📡 Fetching: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    // Sauvegarder la réponse complète
    fs.writeFileSync("debug-espn-standings.json", JSON.stringify(data, null, 2));
    console.log("✅ Réponse sauvegardée dans: debug-espn-standings.json");

    // Analyser la structure
    console.log("\n📋 Structure de la réponse:");
    console.log("- Clés racine:", Object.keys(data));

    if (data.children) {
      console.log(`- Nombre de conférences: ${data.children.length}`);

      for (const conf of data.children) {
        console.log(`\n  Conférence: ${conf.name} (${conf.abbreviation})`);

        if (conf.standings?.entries) {
          const firstTeam = conf.standings.entries[0];
          console.log(`  - Nombre d'équipes: ${conf.standings.entries.length}`);
          console.log(`  - Exemple équipe (${firstTeam.team.displayName}):`);
          console.log(`    * team.id: ${firstTeam.team.id}`);
          console.log(`    * team.abbreviation: ${firstTeam.team.abbreviation}`);
          console.log(`    * team.displayName: ${firstTeam.team.displayName}`);
          console.log(`    * team.shortDisplayName: ${firstTeam.team.shortDisplayName}`);

          // Vérifier dans la DB
          const dbTeam = await prisma.team.findFirst({
            where: {
              OR: [
                { abbreviation: firstTeam.team.abbreviation },
                { externalId: firstTeam.team.id }
              ]
            }
          });

          if (dbTeam) {
            console.log(`    ✅ Trouvé en DB: ${dbTeam.abbreviation} (externalId: ${dbTeam.externalId})`);
          } else {
            console.log(`    ❌ PAS TROUVÉ EN DB !`);
            console.log(`       Cherché: abbreviation="${firstTeam.team.abbreviation}" OU externalId="${firstTeam.team.id}"`);
          }

          // Afficher les stats disponibles
          if (firstTeam.stats) {
            console.log(`    * Nombre de stats: ${firstTeam.stats.length}`);
            const statNames = firstTeam.stats.slice(0, 5).map((s: any) => s.abbreviation || s.name);
            console.log(`    * Premières stats: ${statNames.join(", ")}`);
          }
        }
      }
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

// ============================================
// 2. DEBUG ESPN PLAYER INFO
// ============================================

async function debugESPNPlayer() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DEBUG ESPN PLAYER INFO");
  console.log("=".repeat(60));

  try {
    // Prendre un joueur connu (Stephen Curry)
    const player = await prisma.player.findFirst({
      where: {
        fullName: { contains: "Curry", mode: "insensitive" }
      }
    });

    if (!player) {
      console.log("❌ Aucun joueur Curry trouvé en DB");
      return;
    }

    console.log(`\n👤 Test avec: ${player.fullName}`);
    console.log(`   externalId en DB: ${player.externalId}`);

    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${player.externalId}`;
    console.log(`\n📡 Fetching: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ Erreur HTTP ${response.status}`);
      return;
    }

    const data = await response.json();

    // Sauvegarder
    fs.writeFileSync("debug-espn-player.json", JSON.stringify(data, null, 2));
    console.log("✅ Réponse sauvegardée dans: debug-espn-player.json");

    // Analyser
    const athlete = data.athlete;
    if (athlete) {
      console.log("\n📋 Données disponibles:");
      console.log(`- displayHeight: ${athlete.displayHeight}`);
      console.log(`- height: ${athlete.height}`);
      console.log(`- displayWeight: ${athlete.displayWeight}`);
      console.log(`- weight: ${athlete.weight}`);
      console.log(`- college: ${JSON.stringify(athlete.college)}`);
      console.log(`- birthPlace: ${JSON.stringify(athlete.birthPlace)}`);
      console.log(`- citizenship: ${athlete.citizenship}`);
      console.log(`- nationality: ${athlete.nationality}`);
    } else {
      console.log("❌ Pas de données athlete dans la réponse");
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

// ============================================
// 3. DEBUG ESPN INJURIES
// ============================================

async function debugESPNInjuries() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DEBUG ESPN INJURIES");
  console.log("=".repeat(60));

  try {
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";
    console.log(`\n📡 Fetching: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    // Sauvegarder
    fs.writeFileSync("debug-espn-injuries.json", JSON.stringify(data, null, 2));
    console.log("✅ Réponse sauvegardée dans: debug-espn-injuries.json");

    if (data.injuries && data.injuries.length > 0) {
      console.log(`\n📋 ${data.injuries.length} blessures trouvées`);

      const firstInjury = data.injuries[0];
      console.log(`\n Exemple de blessure:`);
      console.log(`- athlete.id: ${firstInjury.athlete?.id}`);
      console.log(`- athlete.displayName: ${firstInjury.athlete?.displayName}`);
      console.log(`- status: ${firstInjury.status}`);
      console.log(`- type: ${firstInjury.type}`);
      console.log(`- details: ${JSON.stringify(firstInjury.details)}`);
      console.log(`- longComment: ${firstInjury.longComment}`);

      // Essayer de matcher en DB
      if (firstInjury.athlete?.id) {
        const player = await prisma.player.findFirst({
          where: { externalId: firstInjury.athlete.id.toString() }
        });

        if (player) {
          console.log(`✅ Joueur trouvé en DB: ${player.fullName}`);
        } else {
          console.log(`❌ Joueur NON trouvé en DB par externalId`);

          // Essayer par nom
          if (firstInjury.athlete.displayName) {
            const playerByName = await prisma.player.findFirst({
              where: { fullName: { contains: firstInjury.athlete.displayName, mode: "insensitive" } }
            });

            if (playerByName) {
              console.log(`✅ Trouvé par nom: ${playerByName.fullName} (externalId: ${playerByName.externalId})`);
              console.log(`   ⚠️ externalId mismatch: ESPN=${firstInjury.athlete.id} vs DB=${playerByName.externalId}`);
            }
          }
        }
      }
    } else {
      console.log("❌ Aucune blessure dans la réponse");
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

// ============================================
// 4. DEBUG DB TEAMS
// ============================================

async function debugDBTeams() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DEBUG DATABASE TEAMS");
  console.log("=".repeat(60));

  const teams = await prisma.team.findMany({
    orderBy: { abbreviation: "asc" }
  });

  console.log(`\n📋 ${teams.length} équipes en DB:\n`);

  for (const team of teams) {
    console.log(`${team.abbreviation.padEnd(4)} | externalId: ${team.externalId.padEnd(12)} | ${team.city} ${team.name}`);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🔬 SCRIPT DE DEBUG NBA APIs");
  console.log("Date: " + new Date().toISOString());

  await debugDBTeams();
  await debugESPNStandings();
  await debugESPNPlayer();
  await debugESPNInjuries();

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEBUG TERMINÉ");
  console.log("=".repeat(60));
  console.log("\nFichiers JSON générés:");
  console.log("- debug-espn-standings.json");
  console.log("- debug-espn-player.json");
  console.log("- debug-espn-injuries.json");
  console.log("\nAnalyse ces fichiers pour comprendre la structure exacte !");

  await prisma.$disconnect();
}

main();
