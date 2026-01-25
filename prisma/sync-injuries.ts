/**
 * Synchronisation manuelle des blessures NBA depuis ESPN
 *
 * Usage: npx tsx prisma/sync-injuries.ts
 *
 * Ce script fait la même chose que le CRON update-injuries
 * mais peut être lancé manuellement.
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const ESPN_INJURIES_API =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";

// Mapping des noms d'équipes ESPN vers les abréviations
const TEAM_NAME_TO_ABBR: Record<string, string> = {
  "Atlanta Hawks": "ATL",
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA",
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL",
  "Denver Nuggets": "DEN",
  "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW",
  "Houston Rockets": "HOU",
  "Indiana Pacers": "IND",
  "LA Clippers": "LAC",
  "Los Angeles Clippers": "LAC",
  "Los Angeles Lakers": "LAL",
  "LA Lakers": "LAL",
  "Memphis Grizzlies": "MEM",
  "Miami Heat": "MIA",
  "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN",
  "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC",
  "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX",
  "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS",
  "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
};

/**
 * Dictionnaire de traduction des parties du corps / types de blessures
 */
const INJURY_TRANSLATIONS: Record<string, string> = {
  // Parties du corps
  "knee": "Genou",
  "left knee": "Genou gauche",
  "right knee": "Genou droit",
  "ankle": "Cheville",
  "left ankle": "Cheville gauche",
  "right ankle": "Cheville droite",
  "back": "Dos",
  "lower back": "Bas du dos",
  "upper back": "Haut du dos",
  "hip": "Hanche",
  "left hip": "Hanche gauche",
  "right hip": "Hanche droite",
  "hamstring": "Ischio-jambiers",
  "left hamstring": "Ischio-jambiers gauche",
  "right hamstring": "Ischio-jambiers droit",
  "quad": "Quadriceps",
  "quadriceps": "Quadriceps",
  "calf": "Mollet",
  "left calf": "Mollet gauche",
  "right calf": "Mollet droit",
  "foot": "Pied",
  "left foot": "Pied gauche",
  "right foot": "Pied droit",
  "toe": "Orteil",
  "achilles": "Tendon d'Achille",
  "groin": "Adducteur",
  "shoulder": "Épaule",
  "left shoulder": "Épaule gauche",
  "right shoulder": "Épaule droite",
  "elbow": "Coude",
  "wrist": "Poignet",
  "left wrist": "Poignet gauche",
  "right wrist": "Poignet droit",
  "hand": "Main",
  "left hand": "Main gauche",
  "right hand": "Main droite",
  "finger": "Doigt",
  "thumb": "Pouce",
  "arm": "Bras",
  "forearm": "Avant-bras",
  "neck": "Cou",
  "head": "Tête",
  "eye": "Œil",
  "nose": "Nez",
  "rib": "Côte",
  "ribs": "Côtes",
  "chest": "Poitrine",
  "abdomen": "Abdomen",
  "abdominal": "Abdominaux",
  "leg": "Jambe",
  "thigh": "Cuisse",
  "shin": "Tibia",
  "pelvis": "Bassin",
  "glute": "Fessier",
  "oblique": "Oblique",
  "hip flexor": "Fléchisseur de hanche",
  "core": "Abdominaux",
  // Types de blessures
  "illness": "Maladie",
  "concussion": "Commotion",
  "personal": "Raisons personnelles",
  "rest": "Repos",
  "load management": "Gestion de charge",
  "suspension": "Suspension",
  "acl": "Ligament croisé",
  "mcl": "Ligament collatéral",
};

/**
 * Extraire le type de blessure depuis le shortComment ESPN
 * Format typique: "Player (knee) is out..." ou "Player (left ankle) will miss..."
 */
function extractInjuryType(shortComment: string | null): string | null {
  if (!shortComment) return null;

  // Chercher le contenu entre parenthèses après le nom du joueur
  const match = shortComment.match(/\(([^)]+)\)/);
  if (match) {
    const injuryType = match[1].toLowerCase().trim();

    // Chercher une traduction (d'abord les expressions complètes, puis les mots simples)
    for (const [en, fr] of Object.entries(INJURY_TRANSLATIONS)) {
      if (injuryType === en.toLowerCase()) {
        return fr;
      }
    }

    // Si pas de traduction exacte, essayer de traduire partiellement
    let translated = injuryType;

    // Traduire left/right
    translated = translated.replace(/\bleft\b/gi, "gauche");
    translated = translated.replace(/\bright\b/gi, "droit");

    // Traduire la partie du corps
    for (const [en, fr] of Object.entries(INJURY_TRANSLATIONS)) {
      if (!en.includes(" ")) { // Mots simples seulement
        const regex = new RegExp(`\\b${en}\\b`, "gi");
        translated = translated.replace(regex, fr.toLowerCase());
      }
    }

    // Capitaliser la première lettre
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  return null;
}

/**
 * Calculer la durée estimée depuis la date de retour
 */
function formatDuration(returnDate: Date | null): string | null {
  if (!returnDate) return null;

  const now = new Date();
  const diffMs = returnDate.getTime() - now.getTime();

  if (diffMs < 0) return null; // Date passée

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return `${diffDays} j.`;
  } else if (diffDays <= 60) {
    const weeks = Math.ceil(diffDays / 7);
    return `${weeks} sem.`;
  } else {
    const months = Math.ceil(diffDays / 30);
    return `${months} mois`;
  }
}

/**
 * Extraire l'ESPN Player ID depuis l'URL du joueur
 */
function extractEspnPlayerId(athlete: any): string | null {
  // Essayer d'abord l'ID direct
  if (athlete?.id) {
    return String(athlete.id);
  }

  // Sinon extraire depuis les liens
  const links = athlete?.links || [];
  for (const link of links) {
    const match = link.href?.match(/\/id\/(\d+)\//);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function syncInjuries() {
  console.log("🏥 Synchronisation des blessures NBA depuis ESPN...\n");

  try {
    // Récupérer l'infirmerie depuis ESPN
    const response = await fetch(ESPN_INJURIES_API);

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();
    // L'API retourne "injuries" pas "teams"
    const teamsWithInjuries = data.injuries || [];

    console.log(`📊 ${teamsWithInjuries.length} équipes avec des blessés\n`);

    let totalUpdated = 0;
    let totalChecked = 0;
    let notFound = 0;

    // Pour chaque équipe
    for (const teamData of teamsWithInjuries) {
      // L'API utilise displayName (ex: "Atlanta Hawks")
      const teamDisplayName = teamData.displayName;
      const teamAbbr = TEAM_NAME_TO_ABBR[teamDisplayName];

      if (!teamAbbr) {
        console.log(`⚠️  Équipe non mappée: ${teamDisplayName}`);
        continue;
      }

      // Trouver l'équipe dans notre DB
      const dbTeam = await prisma.team.findFirst({
        where: { abbreviation: teamAbbr },
      });

      if (!dbTeam) {
        console.log(`⚠️  Équipe ${teamAbbr} non trouvée en DB`);
        continue;
      }

      const injuries = teamData.injuries || [];

      if (injuries.length > 0) {
        console.log(`\n${teamAbbr} (${teamDisplayName}) - ${injuries.length} joueur(s) blessé(s):`);
      }

      // Pour chaque joueur blessé
      for (const injury of injuries) {
        totalChecked++;

        const athlete = injury.athlete;
        const espnPlayerId = extractEspnPlayerId(athlete);
        const playerName = athlete?.displayName || "Unknown";
        const injuryStatus = injury.status || "UNKNOWN";
        const shortComment = injury.shortComment || null;
        const returnDate = injury.date ? new Date(injury.date) : null;

        // Extraire et traduire le type de blessure (ex: "Genou gauche")
        const injuryNote = extractInjuryType(shortComment);

        if (!espnPlayerId) {
          console.log(`  ❌ ${playerName} - Pas d'ESPN ID trouvé`);
          notFound++;
          continue;
        }

        // Trouver le joueur dans notre DB par ESPN ID (externalId)
        let dbPlayer = await prisma.player.findFirst({
          where: { externalId: espnPlayerId },
        });

        // Si pas trouvé par ESPN ID, essayer par nom
        if (!dbPlayer) {
          dbPlayer = await prisma.player.findFirst({
            where: {
              fullName: playerName,
              teamId: dbTeam.id,
            },
          });
        }

        if (!dbPlayer) {
          console.log(`  ❌ ${playerName} (ESPN ID: ${espnPlayerId}) - Non trouvé en DB`);
          notFound++;
          continue;
        }

        // Mapper le statut ESPN vers notre enum
        let playerStatus: "ACTIVE" | "INJURED" | "OUT" | "DAY_TO_DAY" | "QUESTIONABLE" =
          "ACTIVE";

        const statusLower = injuryStatus.toLowerCase();
        if (statusLower.includes("out")) {
          playerStatus = "OUT";
        } else if (statusLower.includes("day-to-day") || statusLower.includes("day to day")) {
          playerStatus = "DAY_TO_DAY";
        } else if (statusLower.includes("questionable")) {
          playerStatus = "QUESTIONABLE";
        } else if (statusLower.includes("injured")) {
          playerStatus = "INJURED";
        }

        // Vérifier si une mise à jour est nécessaire
        if (dbPlayer.injuryStatus === playerStatus && dbPlayer.injuryNote === injuryNote) {
          console.log(`  ⏭️  ${dbPlayer.fullName} - Déjà à jour (${playerStatus})`);
          continue;
        }

        // Mettre à jour le joueur
        await prisma.player.update({
          where: { id: dbPlayer.id },
          data: {
            injuryStatus: playerStatus,
            injuryNote: injuryNote,
            injuryReturnDate: returnDate,
            isInjured: playerStatus !== "ACTIVE",
            externalId: espnPlayerId,
          },
        });

        totalUpdated++;
        console.log(`  ✅ ${dbPlayer.fullName} → ${playerStatus}${injuryNote ? ` | ${injuryNote}` : ""}`);
      }
    }

    // Réactiver les joueurs qui ne sont plus dans l'infirmerie
    console.log("\n🔄 Vérification des joueurs à réactiver...");

    // Chercher TOUS les joueurs marqués comme blessés (isInjured: true)
    const injuredPlayers = await prisma.player.findMany({
      where: {
        isInjured: true,
      },
      include: {
        team: true,
      },
    });

    let reactivated = 0;

    // Construire un Set de tous les ESPN IDs blessés
    const injuredEspnIds = new Set<string>();
    for (const teamData of teamsWithInjuries) {
      for (const injury of teamData.injuries || []) {
        const espnId = extractEspnPlayerId(injury.athlete);
        if (espnId) {
          injuredEspnIds.add(espnId);
        }
      }
    }

    for (const player of injuredPlayers) {
      // Si le joueur n'est plus dans la liste des blessés
      if (player.externalId && !injuredEspnIds.has(player.externalId)) {
        await prisma.player.update({
          where: { id: player.id },
          data: {
            injuryStatus: "ACTIVE",
            injuryNote: null,
            injuryReturnDate: null,
            isInjured: false,
          },
        });

        reactivated++;
        console.log(`  🟢 ${player.fullName} réactivé (n'est plus blessé)`);
      }
    }

    // Résumé
    console.log("\n" + "=".repeat(50));
    console.log("✅ SYNCHRONISATION TERMINÉE");
    console.log("=".repeat(50));
    console.log(`📊 Joueurs vérifiés : ${totalChecked}`);
    console.log(`✅ Mis à jour : ${totalUpdated}`);
    console.log(`🟢 Réactivés : ${reactivated}`);
    console.log(`❌ Non trouvés : ${notFound}`);

    // Stats finales
    const injuredCount = await prisma.player.count({
      where: {
        injuryStatus: {
          in: ["INJURED", "OUT", "DAY_TO_DAY", "QUESTIONABLE"],
        },
      },
    });

    console.log(`\n🏥 Total joueurs blessés en DB : ${injuredCount}`);
  } catch (error) {
    console.error("\n❌ Erreur:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncInjuries()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script échoué:", error);
    process.exit(1);
  });
