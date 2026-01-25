/**
 * ESPN NBA API Client
 * API gratuite, pas de clé nécessaire
 * Fournit les vraies heures des matchs (contrairement à BallDontLie)
 */

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
    competitors: ESPNCompetitor[];
    status: {
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
  const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;

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
  statusName: string
): "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED" {
  const normalized = statusName.toUpperCase();

  if (normalized.includes("FINAL")) return "FINAL";
  if (normalized.includes("PROGRESS") || normalized.includes("LIVE"))
    return "LIVE";
  if (normalized.includes("POSTPONED")) return "POSTPONED";
  if (normalized.includes("CANCELLED") || normalized.includes("CANCELED"))
    return "CANCELLED";

  return "SCHEDULED";
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

  return {
    externalId: event.id,
    date: new Date(competition.date), // Vraie heure du match en UTC !
    status: mapESPNStatus(competition.status.type.name),
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
