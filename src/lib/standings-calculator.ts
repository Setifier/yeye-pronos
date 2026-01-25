/**
 * Bibliothèque pour le calcul des standings NBA
 * Extrait de update-scores-and-standings.ts pour réutilisation
 */

import { prisma } from "@/lib/prisma";

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
}

/**
 * Calcule les statistiques d'une équipe pour la saison en cours
 */
async function calculateTeamStats(
  teamId: string,
  teamInfo: { conference: string; division: string }
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
  };

  // Récupérer tous les matchs terminés de l'équipe
  const games = await prisma.game.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      status: "FINAL",
      winnerId: { not: null },
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
  let recentResults: boolean[] = []; // true = win, false = loss

  for (const game of games) {
    const isHome = game.homeTeamId === teamId;
    const won = game.winnerId === teamId;

    // Victoires/Défaites globales
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }

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
export async function calculateStandings(teamId: string): Promise<void> {
  // Récupérer les infos de l'équipe
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  console.log(`[STANDINGS] Calculating for ${team.abbreviation}...`);

  // Calculer les stats
  const stats = await calculateTeamStats(teamId, {
    conference: team.conference,
    division: team.division,
  });

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
      teamId_season: {
        teamId: teamId,
        season: "2025-26", // IMPORTANT: Garder cohérent avec le reste de l'app
      },
    },
    create: {
      teamId,
      season: "2025-26",
      wins: stats.wins,
      losses: stats.losses,
      winPct,
      homeRecord,
      awayRecord,
      conferenceRecord,
      divisionRecord,
      last10Record,
      currentStreak: stats.currentStreak,
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
    },
  });

  console.log(
    `[STANDINGS] ${team.abbreviation}: ${stats.wins}-${stats.losses} (${(winPct * 100).toFixed(1)}%)`
  );
}

/**
 * Recalcule les standings pour toutes les équipes
 */
export async function recalculateAllStandings(): Promise<void> {
  console.log("[STANDINGS] Recalculating all teams...");

  const teams = await prisma.team.findMany({
    orderBy: { abbreviation: "asc" },
  });

  for (const team of teams) {
    await calculateStandings(team.id);
  }

  console.log(`[STANDINGS] All ${teams.length} teams updated successfully`);
}
