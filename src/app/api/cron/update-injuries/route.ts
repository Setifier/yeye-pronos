import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * CRON Job: Update Injury Reports
 *
 * Déclenché toutes les 15 minutes
 *
 * Objectif :
 * - Récupérer les dernières infos blessures depuis ESPN
 * - Mettre à jour le statut des joueurs (ACTIVE, OUT, DAY_TO_DAY, etc.)
 * - Synchroniser avec la base de données
 *
 * Sécurité : Protégé par CRON_SECRET
 */

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
  "knee": "Genou", "left knee": "Genou gauche", "right knee": "Genou droit",
  "ankle": "Cheville", "left ankle": "Cheville gauche", "right ankle": "Cheville droite",
  "back": "Dos", "lower back": "Bas du dos", "hip": "Hanche",
  "hamstring": "Ischio-jambiers", "quad": "Quadriceps", "calf": "Mollet",
  "foot": "Pied", "achilles": "Tendon d'Achille", "groin": "Adducteur",
  "shoulder": "Épaule", "elbow": "Coude", "wrist": "Poignet",
  "hand": "Main", "finger": "Doigt", "thumb": "Pouce",
  "illness": "Maladie", "concussion": "Commotion", "personal": "Raisons personnelles",
  "rest": "Repos", "acl": "Ligament croisé",
};

/**
 * Extraire le type de blessure depuis le shortComment ESPN
 */
function extractInjuryType(shortComment: string | null): string | null {
  if (!shortComment) return null;

  const match = shortComment.match(/\(([^)]+)\)/);
  if (match) {
    const injuryType = match[1].toLowerCase().trim();

    for (const [en, fr] of Object.entries(INJURY_TRANSLATIONS)) {
      if (injuryType === en.toLowerCase()) return fr;
    }

    let translated = injuryType
      .replace(/\bleft\b/gi, "gauche")
      .replace(/\bright\b/gi, "droit");

    for (const [en, fr] of Object.entries(INJURY_TRANSLATIONS)) {
      if (!en.includes(" ")) {
        translated = translated.replace(new RegExp(`\\b${en}\\b`, "gi"), fr.toLowerCase());
      }
    }

    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return null;
}

/**
 * Extraire l'ESPN Player ID depuis l'objet athlete
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

export async function GET(request: NextRequest) {
  try {
    // Vérifier le secret CRON
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON INJURIES] Starting injury reports update...");

    // Récupérer l'infirmerie depuis ESPN
    const espnResponse = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
    );

    if (!espnResponse.ok) {
      throw new Error(`ESPN API error: ${espnResponse.status}`);
    }

    const data = await espnResponse.json();
    // L'API ESPN retourne "injuries" pas "teams"
    const teamsWithInjuries = data.injuries || [];

    let totalUpdated = 0;
    let totalChecked = 0;
    let notFound = 0;

    // Pour chaque équipe
    for (const teamData of teamsWithInjuries) {
      // L'API utilise displayName (ex: "Atlanta Hawks")
      const teamDisplayName = teamData.displayName;
      const teamAbbr = TEAM_NAME_TO_ABBR[teamDisplayName];

      if (!teamAbbr) {
        console.log(`[CRON INJURIES] Team not mapped: ${teamDisplayName}`);
        continue;
      }

      // Trouver l'équipe dans notre DB
      const dbTeam = await prisma.team.findFirst({
        where: { abbreviation: teamAbbr },
      });

      if (!dbTeam) {
        console.log(`[CRON INJURIES] Team ${teamAbbr} not found in DB, skipping`);
        continue;
      }

      const injuries = teamData.injuries || [];

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
          console.log(`[CRON INJURIES] ${playerName} - No ESPN ID found`);
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
          console.log(`[CRON INJURIES] ${playerName} (ESPN ID: ${espnPlayerId}) not found in DB`);
          notFound++;
          continue;
        }

        // Mapper le statut ESPN vers notre enum
        let playerStatus: "ACTIVE" | "INJURED" | "OUT" | "DAY_TO_DAY" | "QUESTIONABLE" = "ACTIVE";

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
        console.log(`[CRON INJURIES] Updated ${dbPlayer.fullName}: ${playerStatus}${injuryNote ? ` | ${injuryNote}` : ""}`);
      }
    }

    // Réactiver les joueurs qui ne sont plus dans l'infirmerie
    console.log("[CRON INJURIES] Checking players to reactivate...");

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
        console.log(`[CRON INJURIES] Reactivated ${player.fullName}`);
      }
    }

    console.log(
      `[CRON INJURIES] Update complete: ${totalChecked} checked, ${totalUpdated} updated, ${reactivated} reactivated, ${notFound} not found`
    );

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      updated: totalUpdated,
      reactivated,
      notFound,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON INJURIES] Error updating injuries:", error);
    return NextResponse.json(
      {
        error: "Error updating injury reports",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
