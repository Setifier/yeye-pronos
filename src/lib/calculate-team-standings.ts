/**
 * Fonction réutilisable pour recalculer les standings des équipes
 * Appelée par le CRON après chaque match terminé
 */

import { PrismaClient } from "@/generated/prisma";

const CURRENT_SEASON = "2025"; // Format court pour la saison 2025-26

interface TeamStats {
  teamId: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  winPct: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  last10Wins: number;
  last10Losses: number;
  currentStreak: string | null;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
  conferenceRank?: number;
  divisionRank?: number;
}

async function calculateTeamStats(
  teamId: string,
  teamInfo: any,
  prisma: PrismaClient
): Promise<TeamStats> {
  // Fetch tous les matchs FINAL de cette équipe pour la saison
  const games = await prisma.game.findMany({
    where: {
      season: CURRENT_SEASON,
      status: "FINAL",
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { gameDate: "asc" },
  });

  const stats: TeamStats = {
    teamId,
    conference: teamInfo.conference,
    division: teamInfo.division,
    wins: 0,
    losses: 0,
    winPct: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    last10Wins: 0,
    last10Losses: 0,
    currentStreak: null,
    pointsFor: 0,
    pointsAgainst: 0,
    gamesPlayed: games.length,
  };

  if (games.length === 0) {
    return stats;
  }

  let streakType: "W" | "L" | null = null;
  let streakCount = 0;
  let totalPointsFor = 0;
  let totalPointsAgainst = 0;

  // Parcourir chaque match
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const isHome = game.homeTeamId === teamId;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;

    if (teamScore === null || oppScore === null) continue;

    const won = teamScore > oppScore;

    // Total W-L
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }

    // Home/Away W-L
    if (isHome) {
      if (won) stats.homeWins++;
      else stats.homeLosses++;
    } else {
      if (won) stats.awayWins++;
      else stats.awayLosses++;
    }

    // Points for/against
    totalPointsFor += teamScore;
    totalPointsAgainst += oppScore;

    // Last 10 games (10 derniers matchs)
    if (i >= games.length - 10) {
      if (won) stats.last10Wins++;
      else stats.last10Losses++;
    }

    // Current streak (calculer depuis le plus récent)
    if (i === games.length - 1) {
      // Dernier match
      streakType = won ? "W" : "L";
      streakCount = 1;

      // Remonter pour trouver la série
      for (let j = games.length - 2; j >= 0; j--) {
        const prevGame = games[j];
        const prevIsHome = prevGame.homeTeamId === teamId;
        const prevTeamScore = prevIsHome
          ? prevGame.homeScore
          : prevGame.awayScore;
        const prevOppScore = prevIsHome
          ? prevGame.awayScore
          : prevGame.homeScore;

        if (prevTeamScore === null || prevOppScore === null) break;

        const prevWon = prevTeamScore > prevOppScore;
        const prevType = prevWon ? "W" : "L";

        if (prevType === streakType) {
          streakCount++;
        } else {
          break;
        }
      }

      stats.currentStreak = `${streakType}${streakCount}`;
    }
  }

  // Calculs finaux
  stats.winPct =
    stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0;
  stats.pointsFor =
    stats.gamesPlayed > 0 ? totalPointsFor / stats.gamesPlayed : 0;
  stats.pointsAgainst =
    stats.gamesPlayed > 0 ? totalPointsAgainst / stats.gamesPlayed : 0;

  return stats;
}

function calculateRanks(allStats: TeamStats[]): void {
  // Conference ranks
  const conferences = ["EAST", "WEST"];

  for (const conf of conferences) {
    const confTeams = allStats
      .filter((s) => s.conference === conf)
      .sort((a, b) => {
        // Tri par Win%, puis par nombre de victoires
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });

    confTeams.forEach((team, index) => {
      team.conferenceRank = index + 1;
    });
  }

  // Division ranks
  const divisions = [
    "Atlantic",
    "Central",
    "Southeast",
    "Northwest",
    "Pacific",
    "Southwest",
  ];

  for (const div of divisions) {
    const divTeams = allStats
      .filter((s) => s.division === div)
      .sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });

    divTeams.forEach((team, index) => {
      team.divisionRank = index + 1;
    });
  }
}

/**
 * Recalcule les standings de toutes les équipes et met à jour la DB
 */
export async function recalculateTeamStandings(prisma: PrismaClient): Promise<void> {
  // 1. Récupérer toutes les équipes
  const teams = await prisma.team.findMany({
    orderBy: { city: "asc" },
  });

  // 2. Calculer les stats pour chaque équipe
  const allStats: TeamStats[] = [];

  for (const team of teams) {
    const stats = await calculateTeamStats(team.id, team, prisma);
    allStats.push(stats);
  }

  // 3. Calculer les ranks
  calculateRanks(allStats);

  // 4. Sauvegarder dans la DB (upsert)
  for (const stats of allStats) {
    await prisma.teamSeasonStats.upsert({
      where: {
        teamId_season: {
          teamId: stats.teamId,
          season: CURRENT_SEASON,
        },
      },
      create: {
        teamId: stats.teamId,
        season: CURRENT_SEASON,
        wins: stats.wins,
        losses: stats.losses,
        winPct: stats.winPct,
        conferenceRank: stats.conferenceRank,
        divisionRank: stats.divisionRank,
        homeRecord: `${stats.homeWins}-${stats.homeLosses}`,
        awayRecord: `${stats.awayWins}-${stats.awayLosses}`,
        conferenceRecord: "0-0", // TODO: calculer si nécessaire
        divisionRecord: "0-0", // TODO: calculer si nécessaire
        last10Record: `${stats.last10Wins}-${stats.last10Losses}`,
        currentStreak: stats.currentStreak,
        pointsPerGame: stats.pointsFor,
        pointsAllowedPerGame: stats.pointsAgainst,
        pointDifferential: stats.pointsFor - stats.pointsAgainst,
        reboundsPerGame: 0, // TODO: calculer depuis game stats
        assistsPerGame: 0, // TODO: calculer depuis game stats
        stealsPerGame: 0, // TODO: calculer depuis game stats
        blocksPerGame: 0, // TODO: calculer depuis game stats
        turnoversPerGame: 0, // TODO: calculer depuis game stats
        fieldGoalPct: 0, // TODO: calculer depuis game stats
        threePointPct: 0, // TODO: calculer depuis game stats
        freeThrowPct: 0, // TODO: calculer depuis game stats
      },
      update: {
        wins: stats.wins,
        losses: stats.losses,
        winPct: stats.winPct,
        conferenceRank: stats.conferenceRank,
        divisionRank: stats.divisionRank,
        homeRecord: `${stats.homeWins}-${stats.homeLosses}`,
        awayRecord: `${stats.awayWins}-${stats.awayLosses}`,
        last10Record: `${stats.last10Wins}-${stats.last10Losses}`,
        currentStreak: stats.currentStreak,
        pointsPerGame: stats.pointsFor,
        pointsAllowedPerGame: stats.pointsAgainst,
        pointDifferential: stats.pointsFor - stats.pointsAgainst,
      },
    });
  }
}
