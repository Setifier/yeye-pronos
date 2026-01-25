/**
 * Script pour peupler la DB avec TOUS les joueurs NBA (saison 2025-2026)
 * Source : ESPN API
 * Usage: npx tsx prisma/seed-players.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// IDs ESPN des 30 équipes NBA (actualisés pour 2024-2025)
const NBA_TEAM_IDS = [
  1, // Atlanta Hawks
  2, // Boston Celtics
  3, // New Orleans Pelicans (anciennement Hornets)
  4, // Chicago Bulls
  5, // Cleveland Cavaliers
  6, // Dallas Mavericks
  7, // Denver Nuggets
  8, // Detroit Pistons
  9, // Golden State Warriors
  10, // Houston Rockets
  11, // Indiana Pacers
  12, // LA Clippers
  13, // Los Angeles Lakers
  14, // Miami Heat
  15, // Milwaukee Bucks
  16, // Minnesota Timberwolves
  17, // Brooklyn Nets
  18, // New York Knicks
  19, // Orlando Magic
  20, // Philadelphia 76ers
  21, // Phoenix Suns
  22, // Portland Trail Blazers
  23, // Sacramento Kings
  24, // San Antonio Spurs
  25, // Oklahoma City Thunder
  26, // Utah Jazz
  27, // Washington Wizards
  28, // Toronto Raptors
  29, // Memphis Grizzlies
  30, // Charlotte Hornets
];

interface ESPNPlayer {
  id: string;
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  jersey?: string;
  position?: {
    abbreviation?: string;
  };
}

interface ESPNRosterResponse {
  team: {
    id: string;
    abbreviation: string;
  };
  roster?: {
    entries?: Array<{
      playerId: string;
      athlete: ESPNPlayer;
    }>;
  };
  athletes?: ESPNPlayer[]; // Format alternatif
}

/**
 * Récupère le roster d'une équipe depuis ESPN API
 */
async function fetchTeamRoster(espnTeamId: number): Promise<ESPNPlayer[]> {
  try {
    // ESPN Roster API endpoint
    const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnTeamId}/roster`;

    console.log(`   Fetching roster from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`   ❌ ESPN API error: ${response.status}`);
      return [];
    }

    const data: ESPNRosterResponse = await response.json();

    // Essayer différents formats de réponse ESPN
    let players: ESPNPlayer[] = [];

    if (data.roster?.entries) {
      players = data.roster.entries.map((entry) => entry.athlete);
    } else if (data.athletes) {
      players = data.athletes;
    }

    return players;
  } catch (error) {
    console.error(`   ❌ Error fetching roster for team ${espnTeamId}:`, error);
    return [];
  }
}

/**
 * Normalise le nom complet d'un joueur
 */
function normalizeFullName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  return `${first} ${last}`;
}

async function main() {
  console.log("🏀 Seed des joueurs NBA - Saison 2025-2026\n");
  console.log(`📊 Équipes à traiter : ${NBA_TEAM_IDS.length}\n`);

  let totalPlayers = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  // Récupérer toutes les équipes de la DB
  const teams = await prisma.team.findMany();
  console.log(`✅ ${teams.length} équipes trouvées en DB\n`);

  // Pour chaque équipe NBA
  for (const espnTeamId of NBA_TEAM_IDS) {
    console.log(`\n🏀 Équipe ESPN ID: ${espnTeamId}`);

    // Trouver l'équipe correspondante en DB
    const team = teams.find((t) => t.externalId === String(espnTeamId));

    if (!team) {
      console.log(`   ⚠️  Équipe non trouvée en DB (externalId: ${espnTeamId})`);
      continue;
    }

    console.log(`   ✅ ${team.name} (${team.abbreviation})`);

    // Récupérer le roster depuis ESPN
    const players = await fetchTeamRoster(espnTeamId);
    totalPlayers += players.length;

    console.log(`   📝 ${players.length} joueurs trouvés`);

    // Créer/Update chaque joueur
    for (const player of players) {
      try {
        const firstName = player.firstName || player.displayName.split(" ")[0] || "Unknown";
        const lastName = player.lastName || player.displayName.split(" ").slice(1).join(" ") || "Unknown";
        const fullName = normalizeFullName(firstName, lastName);
        const position = player.position?.abbreviation || null;
        const jerseyNumber = player.jersey || null;

        // Vérifier si le joueur existe déjà
        const existing = await prisma.player.findUnique({
          where: { externalId: player.id },
        });

        if (existing) {
          // Update joueur existant
          await prisma.player.update({
            where: { externalId: player.id },
            data: {
              firstName,
              lastName,
              fullName,
              position,
              jerseyNumber,
              teamId: team.id,
            },
          });
          totalUpdated++;
          console.log(`      ♻️  Updated: ${fullName}`);
        } else {
          // Créer nouveau joueur
          await prisma.player.create({
            data: {
              externalId: player.id,
              firstName,
              lastName,
              fullName,
              position,
              jerseyNumber,
              teamId: team.id,
            },
          });
          totalCreated++;
          console.log(`      ✅ Created: ${fullName} (#${jerseyNumber || "?"} - ${position || "?"})`);
        }
      } catch (error) {
        console.error(`      ❌ Error processing player ${player.displayName}:`, error);
        totalErrors++;
      }
    }

    // Pause entre chaque équipe pour éviter rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Résumé :`);
  console.log(`   🏀 Total joueurs trouvés : ${totalPlayers}`);
  console.log(`   ✅ Joueurs créés : ${totalCreated}`);
  console.log(`   ♻️  Joueurs mis à jour : ${totalUpdated}`);
  console.log(`   ❌ Erreurs : ${totalErrors}`);
  console.log("=".repeat(60) + "\n");

  // Statistiques finales
  const playerCount = await prisma.player.count();
  console.log(`📊 Total joueurs en DB : ${playerCount}`);
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
