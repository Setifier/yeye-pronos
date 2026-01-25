/**
 * Script pour corriger l'assignation des équipes aux joueurs
 *
 * Problème : Les joueurs sont corrects mais assignés aux mauvaises équipes
 * Solution : Utiliser l'abbreviation retournée par ESPN API au lieu du mapping hardcodé
 *
 * Usage: npx tsx prisma/fix-player-teams.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// On va tester tous les IDs ESPN de 1 à 30
const ESPN_TEAM_IDS = Array.from({ length: 30 }, (_, i) => i + 1);

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
    abbreviation: string; // ← C'EST ÇA QU'ON UTILISE !
    displayName: string;
  };
  roster?: {
    entries?: Array<{
      playerId: string;
      athlete: ESPNPlayer;
    }>;
  };
  athletes?: ESPNPlayer[];
}

// Mapping des abbreviations ESPN vers les abbreviations DB
const ESPN_TO_DB_ABBR: { [espnAbbr: string]: string } = {
  "NO": "NOP",   // New Orleans Pelicans
  "GS": "GSW",   // Golden State Warriors
  "NY": "NYK",   // New York Knicks
  "SA": "SAS",   // San Antonio Spurs
  "UTAH": "UTA", // Utah Jazz
  "WSH": "WAS",  // Washington Wizards
};

/**
 * Récupère le roster ET l'abbreviation de l'équipe depuis ESPN API
 */
async function fetchTeamRosterWithAbbr(espnTeamId: number): Promise<{
  abbreviation: string;
  teamName: string;
  players: ESPNPlayer[];
} | null> {
  try {
    const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnTeamId}/roster`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`   ❌ ESPN API error: ${response.status}`);
      return null;
    }

    const data: ESPNRosterResponse = await response.json();

    // Récupérer l'abbreviation de l'équipe
    let abbreviation = data.team.abbreviation;
    const teamName = data.team.displayName;

    // Convertir l'abbreviation ESPN vers celle de la DB si nécessaire
    if (ESPN_TO_DB_ABBR[abbreviation]) {
      abbreviation = ESPN_TO_DB_ABBR[abbreviation];
    }

    // Essayer différents formats de réponse ESPN
    let players: ESPNPlayer[] = [];

    if (data.roster?.entries) {
      players = data.roster.entries.map((entry) => entry.athlete);
    } else if (data.athletes) {
      players = data.athletes;
    }

    return {
      abbreviation,
      teamName,
      players,
    };
  } catch (error) {
    console.error(`   ❌ Error fetching roster for ESPN ID ${espnTeamId}:`, error);
    return null;
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
  console.log("🔧 Correction de l'assignation des équipes aux joueurs\n");
  console.log("⚠️  Les joueurs sont corrects, mais assignés aux mauvaises équipes");
  console.log("✅ On va utiliser les abbreviations ESPN pour matcher correctement\n");

  // Récupérer toutes les équipes de la DB
  const teams = await prisma.team.findMany();
  console.log(`✅ ${teams.length} équipes trouvées en DB\n`);

  let totalUpdated = 0;
  let totalErrors = 0;

  // Pour chaque ID ESPN (1-30)
  for (const espnId of ESPN_TEAM_IDS) {
    console.log(`\n🏀 ESPN Team ID: ${espnId}`);

    // Fetch roster avec abbreviation
    const rosterData = await fetchTeamRosterWithAbbr(espnId);

    if (!rosterData) {
      console.log(`   ⚠️  Pas de données pour ESPN ID ${espnId}`);
      continue;
    }

    const { abbreviation, teamName, players } = rosterData;

    console.log(`   ✅ ${teamName} (${abbreviation})`);
    console.log(`   📝 ${players.length} joueurs trouvés`);

    // Trouver l'équipe correspondante en DB par ABBREVIATION
    const team = teams.find((t) => t.abbreviation === abbreviation);

    if (!team) {
      console.log(`   ❌ Équipe non trouvée en DB : ${abbreviation}`);
      continue;
    }

    // Mettre à jour chaque joueur
    for (const player of players) {
      try {
        const firstName = player.firstName || player.displayName.split(" ")[0] || "Unknown";
        const lastName = player.lastName || player.displayName.split(" ").slice(1).join(" ") || "Unknown";
        const fullName = normalizeFullName(firstName, lastName);
        const position = player.position?.abbreviation || null;
        const jerseyNumber = player.jersey || null;

        // Trouver le joueur existant par externalId
        const existing = await prisma.player.findUnique({
          where: { externalId: player.id },
        });

        if (existing) {
          // Update avec la BONNE équipe
          await prisma.player.update({
            where: { externalId: player.id },
            data: {
              firstName,
              lastName,
              fullName,
              position,
              jerseyNumber,
              teamId: team.id, // ← CORRECTION ICI !
            },
          });
          totalUpdated++;
          console.log(`      ✅ Updated: ${fullName} → ${abbreviation}`);
        } else {
          console.log(`      ⚠️  Joueur non trouvé en DB : ${fullName} (${player.id})`);
        }
      } catch (error) {
        console.error(`      ❌ Error updating ${player.displayName}:`, error);
        totalErrors++;
      }
    }

    // Pause pour éviter rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Résumé :`);
  console.log(`   ✅ Joueurs mis à jour : ${totalUpdated}`);
  console.log(`   ❌ Erreurs : ${totalErrors}`);
  console.log("=".repeat(60) + "\n");

  // Vérification finale
  const playersByTeam = await prisma.player.groupBy({
    by: ["teamId"],
    _count: true,
  });

  console.log(`📊 Répartition des joueurs par équipe :`);
  for (const group of playersByTeam) {
    const team = teams.find((t) => t.id === group.teamId);
    if (team) {
      console.log(`   ${team.abbreviation.padEnd(4)} : ${group._count} joueurs`);
    }
  }
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
