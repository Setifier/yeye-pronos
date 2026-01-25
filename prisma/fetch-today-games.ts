/**
 * Script pour récupérer les matchs d'aujourd'hui depuis ESPN et les stocker en DB
 * Usage: npx tsx prisma/fetch-today-games.ts
 */

import { PrismaClient } from "@/generated/prisma";
import { fetchTodaysGames } from "@/lib/espn";

const prisma = new PrismaClient();

async function main() {
  console.log("🏀 Récupération des matchs d'aujourd'hui...\n");

  // Date d'aujourd'hui en heure de Paris
  const parisTime = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Paris",
  });
  const today = new Date(parisTime);
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  console.log(`📅 Date: ${dateString} (heure de Paris)`);

  try {
    // Récupérer les matchs depuis ESPN
    const games = await fetchTodaysGames(dateString);
    console.log(`\n✅ ${games.length} matchs trouvés sur ESPN\n`);

    if (games.length === 0) {
      console.log("ℹ️  Aucun match prévu aujourd'hui");
      return;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const game of games) {
      console.log(`\n🏀 ${game.visitor_team.abbreviation} @ ${game.home_team.abbreviation}`);

      // Vérifier si les équipes existent
      const homeTeam = await prisma.team.findUnique({
        where: { externalId: game.home_team.id },
      });

      const awayTeam = await prisma.team.findUnique({
        where: { externalId: game.visitor_team.id },
      });

      if (!homeTeam || !awayTeam) {
        console.log(`   ⚠️  Équipe(s) manquante(s) en DB - skip`);
        skipped++;
        continue;
      }

      // Vérifier si le match existe déjà
      const existingGame = await prisma.game.findUnique({
        where: { externalId: game.id },
      });

      const gameDate = new Date(game.date);

      if (existingGame) {
        // Mettre à jour
        await prisma.game.update({
          where: { externalId: game.id },
          data: {
            status: game.status,
            homeScore: game.home_team_score,
            awayScore: game.visitor_team_score,
          },
        });
        console.log(`   ♻️  Mise à jour`);
        updated++;
      } else {
        // Créer
        await prisma.game.create({
          data: {
            externalId: game.id,
            gameDate: gameDate,
            localGameDate: gameDate, // Pour l'instant, même valeur
            status: game.status,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: game.home_team_score,
            awayScore: game.visitor_team_score,
          },
        });
        console.log(`   ✅ Créé`);
        created++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 Résumé:`);
    console.log(`   ✅ Créés: ${created}`);
    console.log(`   ♻️  Mis à jour: ${updated}`);
    console.log(`   ⚠️  Ignorés: ${skipped}`);
    console.log("=".repeat(50) + "\n");

    if (skipped > 0) {
      console.log("⚠️  Certaines équipes sont manquantes en DB.");
      console.log("   Exécute d'abord: npx tsx prisma/seed-espn.ts\n");
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
