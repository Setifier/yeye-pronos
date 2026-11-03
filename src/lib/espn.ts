/**
 * ESPN NBA API Client
 * API gratuite, pas de clé nécessaire
 * Fournit les vraies heures des matchs (contrairement à BallDontLie)
 *
 * Endpoints utilisés (vérifiés le 23/10/2026, saison 2026-27) :
 *   scoreboard   /apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD
 *   summary      /apis/site/v2/sports/basketball/nba/summary?event={id}
 *   teams        /apis/site/v2/sports/basketball/nba/teams?limit=40
 *   roster       /apis/site/v2/sports/basketball/nba/teams/{espnTeamId}/roster
 *   injuries     /apis/site/v2/sports/basketball/nba/injuries
 *   standings    /apis/v2/sports/basketball/nba/standings   (contrôle uniquement)
 *
 * ⚠️ `dates=` est une date US Eastern. Les plages "A-B" renvoient 400 : requêter jour par jour.
 */

export const ESPN_SITE_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
export const ESPN_STANDINGS_API = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

// ============================================
// ABRÉVIATIONS ESPN → DB
// ============================================

/** Seules ces 6 abréviations ESPN diffèrent des abréviations NBA officielles stockées en DB. */
export const ESPN_ABBR_TO_DB: Record<string, string> = {
  UTAH: "UTA",
  GS:   "GSW",
  SA:   "SAS",
  NY:   "NYK",
  NO:   "NOP",
  WSH:  "WAS",
};

export function normalizeEspnAbbr(espnAbbr: string): string {
  return ESPN_ABBR_TO_DB[espnAbbr] ?? espnAbbr;
}

// ============================================
// DATES
// ============================================

/** Date US Eastern d'un instant, au format YYYY-MM-DD. */
export function toEasternDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** "2026-10-23" → "20261023" */
export function toEspnDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/** Liste des dates YYYY-MM-DD entre deux bornes incluses (calcul en UTC, sans dérive de fuseau). */
export function dateRangeInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Décale une date YYYY-MM-DD de n jours. */
export function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================
// NBA CUP
// ============================================

/**
 * Détecte le tour de NBA Cup à partir des notes ESPN.
 * Libellés 2026-27 : "NBA Cup - Group Play", "NBA Cup - Quarterfinals",
 * "NBA Cup - Semifinals", "NBA Cup Championship".
 */
export function detectNbaCupRound(
  notes: Array<{ type?: string; headline?: string }> | undefined
): "GroupPlay" | "Quarterfinal" | "Semifinal" | "Championship" | null {
  if (!notes || notes.length === 0) return null;
  for (const note of notes) {
    const h = (note.headline ?? "").toLowerCase();
    if (!h.includes("nba cup") && !h.includes("in-season tournament") && !h.includes("inseason tournament")) continue;
    if (h.includes("championship") || h.includes("cup final")) return "Championship";
    if (h.includes("semifinal")) return "Semifinal";
    if (h.includes("quarterfinal")) return "Quarterfinal";
    return "GroupPlay";
  }
  return null;
}

export interface ESPNTeam {
  id: string;
  uid: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  color: string;
  logo: string;
}

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: "home" | "away";
  winner?: boolean;
  team: ESPNTeam;
  score: string;
}

export interface ESPNGame {
  id: string;
  uid: string;
  date: string; // ISO 8601 avec heure exacte
  name: string;
  shortName: string;
  season: {
    year: number;
    type: number;
  };
  competitions: Array<{
    id: string;
    date: string;
    neutralSite?: boolean;
    timeValid?: boolean; // false = horaire pas encore fixé (ex: matchs NBA Cup TBD)
    competitors: ESPNCompetitor[];
    status: {
      clock: number;
      displayClock: string;
      period: number;
      type: {
        id: string;
        name: string;
        state: string;
        completed: boolean;
        description: string;
        detail: string;
        shortDetail: string;
      };
    };
    // Playoff-specific fields
    notes?: Array<{
      type: string;    // "rotation" = round name, "event" = "If Necessary"
      headline: string;
    }>;
    series?: {
      type: string;
      title: string;   // e.g. "BOS leads, 2-0"
      summary: string; // e.g. "BOS 2, NYK 0"
      completed: boolean;
    };
  }>;
}

export interface ESPNScoreboardResponse {
  events: ESPNGame[];
}

/**
 * Récupérer les matchs d'une date spécifique
 * @param date Format YYYYMMDD (ex: "20251218")
 */
export async function getGamesByDate(
  date: string
): Promise<ESPNScoreboardResponse> {
  const url = `${ESPN_SITE_API}/scoreboard?dates=${date}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Mapper le status ESPN vers notre format
 */
export function mapESPNStatus(
  statusName: string,
  state?: string // "pre" | "in" | "post" (plus fiable que le nom : STATUS_HALFTIME, STATUS_END_PERIOD…)
): "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED" {
  const normalized = statusName.toUpperCase();

  if (normalized.includes("POSTPONED")) return "POSTPONED";
  if (normalized.includes("CANCELLED") || normalized.includes("CANCELED"))
    return "CANCELLED";
  if (normalized.includes("FINAL")) return "FINAL";
  if (state === "in") return "LIVE";
  if (state === "post") return "FINAL";
  if (
    normalized.includes("PROGRESS") ||
    normalized.includes("LIVE") ||
    normalized.includes("HALFTIME") ||
    normalized.includes("END_PERIOD")
  )
    return "LIVE";

  return "SCHEDULED";
}

/**
 * Parse round info from a competition note headline.
 * e.g. "Western Conference First Round" → { round: 1, conference: "West" }
 */
function parseRoundFromNote(headline: string): { round: number; conference: string } | null {
  const h = headline.toLowerCase();

  let round = 0;
  if (h.includes("first round")) round = 1;
  else if (h.includes("second round") || h.includes("conference semifinals") || h.includes("semifinals")) round = 2;
  else if (h.includes("conference finals") && !h.includes("nba finals")) round = 3;
  else if (h.includes("nba finals") || h.includes("championship series")) round = 4;
  else return null;

  let conference = "Finals";
  if (h.includes("eastern")) conference = "East";
  else if (h.includes("western")) conference = "West";
  // NBA Finals has no conference prefix

  return { round, conference };
}

/**
 * Extraire les infos d'un match ESPN
 */
export function parseESPNGame(event: ESPNGame) {
  const competition = event.competitions[0];
  const homeTeam = competition.competitors.find((c) => c.homeAway === "home");
  const awayTeam = competition.competitors.find((c) => c.homeAway === "away");

  if (!homeTeam || !awayTeam) {
    throw new Error(`Invalid game data for ${event.id}`);
  }

  // Detect "If Necessary" from status description or notes
  const statusDesc = (competition.status.type.description ?? "").toLowerCase();
  const notes = competition.notes ?? [];
  const isIfNecessary =
    statusDesc.includes("if necessary") ||
    notes.some((n) => n.headline?.toLowerCase().includes("if necessary"));

  // Extract round/conference from notes (e.g. "Western Conference First Round")
  let round: number | null = null;
  let conference: string | null = null;
  for (const note of notes) {
    const parsed = parseRoundFromNote(note.headline ?? "");
    if (parsed) {
      round = parsed.round;
      conference = parsed.conference;
      break;
    }
  }

  return {
    externalId: event.id,
    date: new Date(competition.date), // Vraie heure du match en UTC !
    seasonYear: event.season.year,    // Année de FIN de saison (2027 = 2026-27)
    seasonTypeId: event.season.type,  // 1 présaison · 2 régulière · 3 playoffs · 5 play-in
    status: mapESPNStatus(competition.status.type.name, competition.status.type.state),
    currentPeriod: competition.status.period ?? null,
    gameClock: competition.status.displayClock ?? null,
    isIfNecessary,
    round,
    conference,
    nbaCupRound: detectNbaCupRound(notes),
    neutralSite: competition.neutralSite ?? false,
    timeValid: competition.timeValid !== false,
    notes: notes.map((n) => n.headline).filter(Boolean) as string[],
    homeTeam: {
      externalId: homeTeam.id,
      name: homeTeam.team.name,
      city: homeTeam.team.location,
      abbreviation: homeTeam.team.abbreviation,
      fullName: homeTeam.team.displayName,
    },
    awayTeam: {
      externalId: awayTeam.id,
      name: awayTeam.team.name,
      city: awayTeam.team.location,
      abbreviation: awayTeam.team.abbreviation,
      fullName: awayTeam.team.displayName,
    },
    homeScore: homeTeam.score ? parseInt(homeTeam.score) : null,
    awayScore: awayTeam.score ? parseInt(awayTeam.score) : null,
  };
}

/**
 * Récupérer les matchs du jour depuis ESPN
 * @param date Format YYYY-MM-DD (ex: "2025-12-26")
 * @returns Array de matchs formatés pour notre application
 */
export async function fetchTodaysGames(date: string) {
  // Convertir YYYY-MM-DD vers YYYYMMDD pour l'API ESPN
  const espnDate = date.replace(/-/g, "");

  const response = await getGamesByDate(espnDate);

  // Parser et formater pour notre app (format snake_case pour compatibilité)
  return response.events.map(event => {
    const parsed = parseESPNGame(event);
    return {
      id: parsed.externalId,
      date: parsed.date.toISOString(),
      status: parsed.status,
      currentPeriod: parsed.currentPeriod,
      gameClock: parsed.gameClock,
      isIfNecessary: parsed.isIfNecessary,
      home_team: {
        id: parsed.homeTeam.externalId,
        name: parsed.homeTeam.name,
        city: parsed.homeTeam.city,
        abbreviation: parsed.homeTeam.abbreviation,
        full_name: parsed.homeTeam.fullName,
      },
      visitor_team: {
        id: parsed.awayTeam.externalId,
        name: parsed.awayTeam.name,
        city: parsed.awayTeam.city,
        abbreviation: parsed.awayTeam.abbreviation,
        full_name: parsed.awayTeam.fullName,
      },
      home_team_score: parsed.homeScore,
      visitor_team_score: parsed.awayScore,
    };
  });
}
