import { BalldontlieAPI } from "@balldontlie/sdk";

// Singleton pour éviter de créer plusieurs instances
const globalForBdl = global as unknown as { bdl: BalldontlieAPI };

export const bdl =
  globalForBdl.bdl ||
  new BalldontlieAPI({ apiKey: process.env.BALLDONTLIE_API_KEY! });

if (process.env.NODE_ENV !== "production") globalForBdl.bdl = bdl;

// ============================================
// TEAMS
// ============================================

export async function getAllTeams() {
  const response = await bdl.nba.getTeams();
  return response.data;
}

// ============================================
// GAMES
// ============================================

export async function getGamesByDate(date: string) {
  // date format: "YYYY-MM-DD"
  const response = await bdl.nba.getGames({ dates: [date] });
  return response.data;
}

export async function getUpcomingGames(dates: string[]) {
  const response = await bdl.nba.getGames({ dates });
  return response.data;
}

export async function getGameById(gameId: number) {
  const response = await bdl.nba.getGame(gameId);
  return response.data;
}

// ============================================
// PLAYERS
// ============================================

export async function searchPlayers(search: string) {
  const response = await bdl.nba.getPlayers({ search });
  return response.data;
}

export async function getPlayerById(playerId: number) {
  const response = await bdl.nba.getPlayer(playerId);
  return response.data;
}
