/**
 * Bibliothèque pour le calcul des standings NBA
 * Extrait de update-scores-and-standings.ts pour réutilisation
 */

import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";
import { updateStandingRanks } from "@/lib/standings-ranking";

interface TeamStats {
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  conferenceWins: number;
  conferenceLosses: number;
  divisionWins: number;
  divisionLosses: number;
  last10Wins: number;
  last10Losses: number;
  currentStreak: string;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  pointDifferential: number;
}

/**
 * Calcule les statistiques d'une équipe pour une saison donnée
 */
async function calculateTeamStats(
  teamId: string,
  teamInfo: { conference: string; division: string },
  season: string
): Promise<TeamStats> {
  const stats: TeamStats = {
    wins: 0,
    losses: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    divisionWins: 0,
    divisionLosses: 0,
    last10Wins: 0,
    last10Losses: 0,
    currentStreak: "-",
    pointsPerGame: 0,
    pointsAllowedPerGame: 0,
    pointDifferential: 0,
  };

  let totalPointsScored = 0;
  let totalPointsAllowed = 0;

  // Récupérer les matchs de saison régulière uniquement (standings ≠ playoffs)
  // ⚠️ La finale de la NBA Cup ne compte PAS dans le bilan officiel (règle NBA).
  //    Les quarts et demies, eux, comptent.
  const games = await prisma.game.findMany({
    where: {
      AND: [
        { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
        // Prisma : un `not` sur colonne nullable exclut aussi les NULL → OR explicite
        { OR: [{ nbaCupRound: null }, { nbaCupRound: { not: "Championship" } }] },
      ],
      status: "FINAL",
      winnerId: { not: null },
      seasonType: "Regular Season",
      season, // Filter by specific season to avoid counting past seasons
    },
    include: {
      homeTeam: {
        select: { conference: true, division: true },
      },
      awayTeam: {
        select: { conference: true, division: true },
      },
    },
    orderBy: {
      gameDate: "asc",
    },
  });

  if (games.length === 0) {
    return stats;
  }

  // Calculer les stats globales
  const recentResults: boolean[] = []; // true = win, false = loss

  for (const game of games) {
    const isHome = game.homeTeamId === teamId;
    const won = game.winnerId === teamId;

    // Victoires/Défaites globales
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }

    // Points marqués / encaissés
    const scored  = isHome ? (game.homeScore ?? 0) : (game.awayScore ?? 0);
    const allowed = isHome ? (game.awayScore ?? 0) : (game.homeScore ?? 0);
    totalPointsScored  += scored;
    totalPointsAllowed += allowed;

    // Domicile/Extérieur
    if (isHome) {
      if (won) stats.homeWins++;
      else stats.homeLosses++;
    } else {
      if (won) stats.awayWins++;
      else stats.awayLosses++;
    }

    // Conférence
    const opponent = isHome ? game.awayTeam : game.homeTeam;
    if (opponent.conference === teamInfo.conference) {
      if (won) stats.conferenceWins++;
      else stats.conferenceLosses++;
    }

    // Division
    if (opponent.division === teamInfo.division) {
      if (won) stats.divisionWins++;
      else stats.divisionLosses++;
    }

    // Stocker pour série et last 10
    recentResults.push(won);
  }

  // Moyennes de points
  const totalGamesPlayed = games.length;
  if (totalGamesPlayed > 0) {
    stats.pointsPerGame        = totalPointsScored  / totalGamesPlayed;
    stats.pointsAllowedPerGame = totalPointsAllowed / totalGamesPlayed;
    stats.pointDifferential    = stats.pointsPerGame - stats.pointsAllowedPerGame;
  }

  // Calculer Last 10
  const last10Games = recentResults.slice(-10);
  stats.last10Wins = last10Games.filter((w) => w).length;
  stats.last10Losses = last10Games.length - stats.last10Wins;

  // Calculer la série actuelle
  if (recentResults.length > 0) {
    const lastResult = recentResults[recentResults.length - 1];
    let streakCount = 1;

    for (let i = recentResults.length - 2; i >= 0; i--) {
      if (recentResults[i] === lastResult) {
        streakCount++;
      } else {
        break;
      }
    }

    stats.currentStreak = `${lastResult ? "W" : "L"}${streakCount}`;
  }

  return stats;
}

/**
 * Calcule et sauvegarde les standings pour une équipe donnée
 * @param teamId UUID de l'équipe
 */
export async function calculateStandings(
  teamId: string,
  season: string = getCurrentSeason()
): Promise<void> {
  // Récupérer les infos de l'équipe
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  // Calculer les stats
  const stats = await calculateTeamStats(
    teamId,
    { conference: team.conference, division: team.division },
    season
  );

  // Formater les records
  const homeRecord = `${stats.homeWins}-${stats.homeLosses}`;
  const awayRecord = `${stats.awayWins}-${stats.awayLosses}`;
  const conferenceRecord = `${stats.conferenceWins}-${stats.conferenceLosses}`;
  const divisionRecord = `${stats.divisionWins}-${stats.divisionLosses}`;
  const last10Record = `${stats.last10Wins}-${stats.last10Losses}`;

  // Calculer le win %
  const totalGames = stats.wins + stats.losses;
  const winPct = totalGames > 0 ? stats.wins / totalGames : 0;

  // Sauvegarder dans la DB
  await prisma.teamSeasonStats.upsert({
    where: {
      teamId_season: { teamId, season },
    },
    create: {
      teamId,
      season,
      wins: stats.wins,
      losses: stats.losses,
      winPct,
      homeRecord,
      awayRecord,
      conferenceRecord,
      divisionRecord,
      last10Record,
      currentStreak: stats.currentStreak,
      pointsPerGame:        stats.pointsPerGame,
      pointsAllowedPerGame: stats.pointsAllowedPerGame,
      pointDifferential:    stats.pointDifferential,
    },
    update: {
      wins: stats.wins,
      losses: stats.losses,
      winPct,
      homeRecord,
      awayRecord,
      conferenceRecord,
      divisionRecord,
      last10Record,
      currentStreak: stats.currentStreak,
      pointsPerGame:        stats.pointsPerGame,
      pointsAllowedPerGame: stats.pointsAllowedPerGame,
      pointDifferential:    stats.pointDifferential,
    },
  });

  console.log(
    `[STANDINGS] ${team.abbreviation}: ${stats.wins}-${stats.losses} (${(winPct * 100).toFixed(1)}%)`
  );
}

/**
 * Recalcule les standings pour toutes les équipes
 */
export async function recalculateAllStandings(
  season: string = getCurrentSeason()
): Promise<void> {
  console.log(`[STANDINGS] Recalculating all teams for ${season}...`);

  const teams = await prisma.team.findMany({
    orderBy: { abbreviation: "asc" },
  });

  for (const team of teams) {
    await calculateStandings(team.id, season);
  }
  await updateStandingRanks(season);

  console.log(`[STANDINGS] All ${teams.length} teams updated successfully`);
}
