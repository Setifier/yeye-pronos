/**
 * ESPN Stats API - Récupération et sauvegarde des statistiques de matchs
 *
 * Fonctions :
 * - Récupérer le boxscore complet d'un match terminé
 * - Sauvegarder les stats de tous les joueurs dans GamePlayerStats
 * - Identifier le top scorer du match
 * - Créer automatiquement les joueurs manquants (2-way contracts)
 */

import { prisma } from "@/lib/prisma";

// ============================================
// TYPES ESPN
// ============================================

export interface ESPNAthlete {
  id: string;
  uid: string;
  guid?: string;
  displayName: string;
  shortName: string;
  links?: Array<{
    rel: string[];
    href: string;
    text: string;
  }>;
}

export interface ESPNPlayerStats {
  active: boolean;
  athlete: ESPNAthlete;
  stats: string[]; // Stats dans l'ordre des "keys"
}

export interface ESPNTeamStats {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
  };
  statistics: Array<{
    names: string[];
    keys: string[];
    labels: string[];
    descriptions: string[];
    athletes: ESPNPlayerStats[];
  }>;
}

export interface ESPNBoxscoreResponse {
  boxscore?: {
    teams?: ESPNTeamStats[];
    players?: ESPNTeamStats[];
  };
  header?: {
    competitions?: Array<{
      competitors?: Array<{
        id: string;
        homeAway: "home" | "away";
        team: {
          id: string;
          abbreviation: string;
        };
      }>;
    }>;
  };
}

// ============================================
// MAPPING DES ABBREVIATIONS ESPN → DB
// ============================================

/**
 * Map des abbreviations ESPN vers celles de notre DB (BallDontLie)
 * Certaines équipes ont des abbreviations différentes entre les APIs
 */
const ESPN_ABBR_TO_DB: Record<string, string> = {
  // Abbreviations différentes
  "UTAH": "UTA",
  "GS": "GSW",
  "SA": "SAS",
  "NY": "NYK",
  "NO": "NOP",
  "WSH": "WAS",  // Washington Wizards
  // Les autres sont identiques, pas besoin de les lister
};

/**
 * Normaliser une abbreviation ESPN vers celle de notre DB
 */
function normalizeAbbreviation(espnAbbr: string): string {
  return ESPN_ABBR_TO_DB[espnAbbr] || espnAbbr;
}

// ============================================
// MAPPING DES STATS
// ============================================

interface ParsedPlayerStats {
  espnPlayerId: string;
  playerName: string;
  teamEspnId: string;
  minutes: string | null;
  points: number;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fieldGoalsMade: number | null;
  fieldGoalsAttempted: number | null;
  threePointersMade: number | null;
  threePointersAttempted: number | null;
  freeThrowsMade: number | null;
  freeThrowsAttempted: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  fouls: number | null;
  plusMinus: number | null;
}

/**
 * Vérifie qu'un champ minutes représente un temps joué réel.
 * Gère les deux formats : "MM:SS" (ESPN) et décimal "32"/"32.7" (BallDontLie)
 * Rejette : null, "0:00", "0", "-", "DNP"
 */
function isValidMinutes(minutes: string | null | undefined): boolean {
  if (!minutes || minutes === "0:00" || minutes === "-" || minutes === "DNP" || minutes === "0") return false;
  // Format MM:SS
  const mmss = minutes.match(/^(\d+):(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) > 0 || parseInt(mmss[2], 10) > 0;
  // Format décimal
  const dec = parseFloat(minutes);
  return !isNaN(dec) && dec > 0;
}

/**
 * Parser une valeur de stat (peut être un nombre ou "X-Y" pour les tirs)
 */
function parseStat(value: string): number | null {
  if (!value || value === "" || value === "-" || value === "0:00") {
    return null;
  }

  // Si c'est un nombre simple
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }

  return null;
}

/**
 * Parser une stat de tirs "X-Y" pour obtenir X (made) et Y (attempted)
 */
function parseShootingStat(value: string): { made: number | null; attempted: number | null } {
  if (!value || value === "" || value === "-") {
    return { made: null, attempted: null };
  }

  const parts = value.split("-");
  if (parts.length !== 2) {
    return { made: null, attempted: null };
  }

  const made = parseInt(parts[0]);
  const attempted = parseInt(parts[1]);

  return {
    made: isNaN(made) ? null : made,
    attempted: isNaN(attempted) ? null : attempted,
  };
}

/**
 * Extraire les stats d'un joueur depuis le format ESPN
 */
function parsePlayerStats(
  athlete: ESPNPlayerStats,
  keys: string[],
  teamEspnId: string
): ParsedPlayerStats {
  const stats = athlete.stats;
  const statsMap = new Map<string, string>();

  // Créer une map key → value
  keys.forEach((key, index) => {
    if (stats[index] !== undefined) {
      statsMap.set(key, stats[index]);
    }
  });

  // Parser les tirs (format "X-Y")
  const fg = parseShootingStat(statsMap.get("fieldGoalsMade-fieldGoalsAttempted") || "");
  const threePt = parseShootingStat(statsMap.get("threePointFieldGoalsMade-threePointFieldGoalsAttempted") || "");
  const ft = parseShootingStat(statsMap.get("freeThrowsMade-freeThrowsAttempted") || "");

  return {
    espnPlayerId: athlete.athlete.id,
    playerName: athlete.athlete.displayName,
    teamEspnId,
    minutes: statsMap.get("minutes") || null,
    points: parseStat(statsMap.get("points") || "0") || 0,
    rebounds: parseStat(statsMap.get("rebounds") || ""),
    assists: parseStat(statsMap.get("assists") || ""),
    steals: parseStat(statsMap.get("steals") || ""),
    blocks: parseStat(statsMap.get("blocks") || ""),
    turnovers: parseStat(statsMap.get("turnovers") || ""),
    fieldGoalsMade: fg.made,
    fieldGoalsAttempted: fg.attempted,
    threePointersMade: threePt.made,
    threePointersAttempted: threePt.attempted,
    freeThrowsMade: ft.made,
    freeThrowsAttempted: ft.attempted,
    offensiveRebounds: parseStat(statsMap.get("offensiveRebounds") || ""),
    defensiveRebounds: parseStat(statsMap.get("defensiveRebounds") || ""),
    fouls: parseStat(statsMap.get("fouls") || ""),
    plusMinus: parseStat(statsMap.get("plusMinus") || ""),
  };
}

// ============================================
// API ESPN - RÉCUPÉRATION BOXSCORE
// ============================================

/**
 * Récupérer le boxscore complet d'un match depuis ESPN
 * @param espnGameId ID ESPN du match (externalId dans notre DB)
 * @returns Boxscore avec stats de tous les joueurs
 */
export async function fetchGameBoxscore(
  espnGameId: string
): Promise<ESPNBoxscoreResponse> {
  const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnGameId}`;

  console.log(`[ESPN Stats] Fetching boxscore for game ${espnGameId}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
  }

  const data: ESPNBoxscoreResponse = await response.json();

  if (!data.boxscore || !data.boxscore.players) {
    console.warn(`[ESPN Stats] No boxscore data for game ${espnGameId}`);
    return { boxscore: undefined };
  }

  return data;
}

// ============================================
// DATABASE - GESTION JOUEURS
// ============================================

/**
 * Trouver une équipe dans la DB par son ESPN ID
 */
export async function findTeamByEspnId(espnTeamId: string): Promise<string | null> {
  const team = await prisma.team.findUnique({
    where: { externalId: espnTeamId },
    select: { id: true },
  });

  return team?.id ?? null;
}

/**
 * Créer un joueur manquant (2-way contract ou nouveau joueur)
 * @returns UUID du joueur créé
 */
async function createMissingPlayer(
  espnPlayerId: string,
  playerName: string,
  teamId: string
): Promise<string> {
  console.log(`[ESPN Stats] Creating missing player: ${playerName} (ESPN ID: ${espnPlayerId})`);

  // Parser le nom (format: "FirstName LastName" ou "F. LastName")
  const nameParts = playerName.split(" ");
  const firstName = nameParts[0] || playerName;
  const lastName = nameParts.slice(1).join(" ") || playerName;

  const player = await prisma.player.create({
    data: {
      externalId: espnPlayerId,
      firstName,
      lastName,
      fullName: playerName,
      teamId,
      position: null, // On ne l'a pas ici, sera mis à jour plus tard
      jerseyNumber: null,
    },
  });

  console.log(`[ESPN Stats] ✅ Player created: ${playerName} (${player.id})`);

  return player.id;
}

// ============================================
// SAUVEGARDE DES STATS
// ============================================

/** Ligne GamePlayerStats d'un joueur pour un match. */
function toStatsRow(gameId: string, playerId: string, teamId: string, stats: ParsedPlayerStats) {
  return {
    gameId,
    playerId,
    teamId,
    points: stats.points,
    rebounds: stats.rebounds,
    assists: stats.assists,
    steals: stats.steals,
    blocks: stats.blocks,
    turnovers: stats.turnovers,
    minutes: stats.minutes,
    fieldGoalsMade: stats.fieldGoalsMade,
    fieldGoalsAttempted: stats.fieldGoalsAttempted,
    threePointersMade: stats.threePointersMade,
    threePointersAttempted: stats.threePointersAttempted,
    freeThrowsMade: stats.freeThrowsMade,
    freeThrowsAttempted: stats.freeThrowsAttempted,
    offensiveRebounds: stats.offensiveRebounds,
    defensiveRebounds: stats.defensiveRebounds,
    plusMinus: stats.plusMinus,
    personalFouls: stats.fouls,
  };
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

export interface TopScorerResult {
  playerId: string; // UUID dans notre DB
  espnPlayerId: string;
  playerName: string;
  points: number;
}

/**
 * Récupérer et sauvegarder les stats complètes d'un match
 *
 * @param espnGameId ID ESPN du match (Game.externalId)
 * @param gameId UUID du match dans notre DB
 * @returns Top scorer du match (ou null si pas de stats)
 */
export async function fetchAndSaveGameStats(
  espnGameId: string,
  gameId: string
): Promise<TopScorerResult | null> {
  console.log(`[ESPN Stats] Processing stats for game ${espnGameId}...`);

  // 1. Récupérer le boxscore
  const boxscoreData = await fetchGameBoxscore(espnGameId);

  if (!boxscoreData.boxscore || !boxscoreData.boxscore.players) {
    console.warn(`[ESPN Stats] No player stats available for game ${espnGameId}`);
    return null;
  }

  const teamsStats = boxscoreData.boxscore.players;

  // 1.5 Récupérer le match depuis notre DB pour avoir les IDs home/away
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { externalId: true, abbreviation: true } },
      awayTeam: { select: { externalId: true, abbreviation: true } },
    },
  });

  if (!game) {
    console.error(`[ESPN Stats] Game not found in DB: ${gameId}`);
    return null;
  }

  console.log(`[ESPN Stats] Match: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
  console.log(`[ESPN Stats] Away Team ESPN ID: ${game.awayTeam.externalId}, Home Team ESPN ID: ${game.homeTeam.externalId}`);

  let topScorer: TopScorerResult | null = null;
  let highestPoints = -1;

  // Lignes à enregistrer (joueurs ayant joué), collectées avant toute écriture
  const lines: Array<{ teamId: string; stats: ParsedPlayerStats }> = [];

  // 2. Parcourir les 2 équipes
  for (const teamStats of teamsStats) {
    const teamEspnId = teamStats.team.id;
    const teamAbbr = teamStats.team.abbreviation;

    // Déterminer si cette équipe est home ou away dans NOTRE match
    // ⚠️ IMPORTANT : Les ESPN IDs du boxscore ESPN sont DIFFÉRENTS des ESPN IDs de BallDontLie
    // On doit UNIQUEMENT utiliser l'abbreviation pour matcher les équipes
    let teamId: string | null = null;
    let teamType: "home" | "away" | null = null;

    // Normaliser l'abbreviation ESPN vers celle de notre DB
    const normalizedAbbr = normalizeAbbreviation(teamAbbr);

    // Match par abbreviation normalisée (les ESPN IDs sont incompatibles entre APIs)
    if (normalizedAbbr === game.homeTeam.abbreviation) {
      teamId = game.homeTeamId;
      teamType = "home";
    } else if (normalizedAbbr === game.awayTeam.abbreviation) {
      teamId = game.awayTeamId;
      teamType = "away";
    }

    if (!teamId || !teamType) {
      console.error(
        `[ESPN Stats] ❌ Team ${teamStats.team.displayName} (ESPN abbr: ${teamAbbr}, normalized: ${normalizedAbbr}) not found in game`
      );
      console.error(`[ESPN Stats]    Expected: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
      continue;
    }

    const abbrInfo = teamAbbr !== normalizedAbbr ? `${teamAbbr} → ${normalizedAbbr}` : teamAbbr;
    console.log(
      `[ESPN Stats] Processing ${teamType.toUpperCase()} team: ${abbrInfo} (ESPN ID: ${teamEspnId})`
    );

    // 3. Parcourir les joueurs de l'équipe
    const statsConfig = teamStats.statistics[0];
    if (!statsConfig) continue;

    for (const athleteData of statsConfig.athletes) {
      // Parser les stats
      const parsedStats = parsePlayerStats(athleteData, statsConfig.keys, teamEspnId);

      // Ignorer les joueurs DNP (Did Not Play)
      // ESPN peut envoyer : null, "0:00", "-", "DNP", ou une valeur non MM:SS
      if (!isValidMinutes(parsedStats.minutes)) {
        continue;
      }

      lines.push({ teamId, stats: parsedStats });
    }
  }

  if (lines.length === 0) {
    console.warn(`[ESPN Stats] No played minutes in boxscore for game ${espnGameId}`);
    return null;
  }

  // 4. Joueurs connus en une requête ; création des manquants (rare : two-way, nouvelle signature)
  const known = await prisma.player.findMany({
    where:  { externalId: { in: lines.map((l) => l.stats.espnPlayerId) } },
    select: { id: true, externalId: true },
  });
  const playerIdByEspnId = new Map(known.map((p) => [p.externalId, p.id]));
  for (const { teamId, stats } of lines) {
    if (!playerIdByEspnId.has(stats.espnPlayerId)) {
      playerIdByEspnId.set(stats.espnPlayerId, await createMissingPlayer(stats.espnPlayerId, stats.playerName, teamId));
    }
  }

  // 5. Box score du match remplacé d'un bloc (idempotent, 2 requêtes) + meilleur marqueur
  const rows = new Map<string, ReturnType<typeof toStatsRow>>(); // une ligne par joueur
  for (const { teamId, stats } of lines) {
    const playerId = playerIdByEspnId.get(stats.espnPlayerId)!;
    rows.set(playerId, toStatsRow(gameId, playerId, teamId, stats));

    if (stats.points > highestPoints) {
      highestPoints = stats.points;
      topScorer = {
        playerId,
        espnPlayerId: stats.espnPlayerId,
        playerName: stats.playerName,
        points: stats.points,
      };
    }
  }

  await prisma.$transaction([
    prisma.gamePlayerStats.deleteMany({ where: { gameId } }),
    prisma.gamePlayerStats.createMany({ data: [...rows.values()] }),
  ]);

  if (topScorer) {
    console.log(`[ESPN Stats] ✅ Top scorer: ${topScorer.playerName} with ${topScorer.points} points`);
  }

  return topScorer;
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Délai pour rate limiting (comme dans vos seeds)
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrapper avec rate limiting automatique
 * @param espnGameId ID ESPN du match
 * @param gameId UUID du match dans notre DB
 * @param delayMs Délai après l'appel (défaut: 1000ms)
 */
export async function fetchAndSaveGameStatsWithDelay(
  espnGameId: string,
  gameId: string,
  delayMs: number = 1000
): Promise<TopScorerResult | null> {
  try {
    const result = await fetchAndSaveGameStats(espnGameId, gameId);

    // Rate limiting
    await delay(delayMs);

    return result;
  } catch (error) {
    console.error(`[ESPN Stats] Error processing game ${espnGameId}:`, error);
    return null;
  }
}
