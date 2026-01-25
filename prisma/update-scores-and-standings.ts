/**
 * ═══════════════════════════════════════════════════════════════════════
 * UPDATE SCORES AND STANDINGS - COMBINED SCRIPT
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Script combiné qui :
 * 1. Met à jour les scores depuis l'API ESPN
 * 2. Recalcule automatiquement les standings
 *
 * Utilisé par le CRON pour maintenir les données à jour
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PrismaClient, GameStatus } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const CURRENT_SEASON = "2025-26";
const ESPN_SCOREBOARD_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const DELAY_MS = 2000; // 2 secondes entre chaque requête

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapGameStatus(status: string): GameStatus {
  const normalized = status.toLowerCase();

  // ESPN format: "STATUS_FINAL", "STATUS_IN_PROGRESS", etc.
  if (normalized.includes("final")) return "FINAL";
  if (normalized.includes("in_progress") || normalized.includes("live")) return "LIVE";
  if (normalized.includes("postponed")) return "POSTPONED";
  if (normalized.includes("cancel")) return "CANCELLED";

  return "SCHEDULED";
}

// ═══════════════════════════════════════════════════════════════════════
// ESPN API
// ═══════════════════════════════════════════════════════════════════════

interface ESPNGame {
  id: string;
  status: {
    type: {
      name: string;
      state: string;
      completed: boolean;
    };
    period?: number;
    displayClock?: string;
  };
  competitions: Array<{
    competitors: Array<{
      id: string;
      homeAway: "home" | "away";
      score: string;
      team: {
        id: string;
      };
    }>;
  }>;
}

async function fetchScoreboardByDate(date: string): Promise<ESPNGame[]> {
  const url = `${ESPN_SCOREBOARD_API}?dates=${date.replace(/-/g, "")}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`   ❌ Erreur fetch ESPN pour ${date}:`, error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UPDATE SCORES
// ═══════════════════════════════════════════════════════════════════════

async function updateScores(): Promise<number> {
  console.log("\n🏀 ÉTAPE 1 : MISE À JOUR DES SCORES");
  console.log("═".repeat(80));

  try {
    // 1. Récupérer tous les matchs qui ne sont pas FINAL
    const gamesToUpdate = await prisma.game.findMany({
      where: {
        season: CURRENT_SEASON,
        status: {
          in: ["SCHEDULED", "LIVE"],
        },
      },
      include: {
        homeTeam: { select: { abbreviation: true } },
        awayTeam: { select: { abbreviation: true } },
      },
      orderBy: { gameDate: "asc" },
    });

    console.log(`📋 ${gamesToUpdate.length} matchs à vérifier`);

    if (gamesToUpdate.length === 0) {
      console.log("✅ Aucun match à mettre à jour !");
      return 0;
    }

    // 2. Grouper par date US Eastern (timezone des matchs NBA)
    const gamesByDate = new Map<string, typeof gamesToUpdate>();

    const easternFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    for (const game of gamesToUpdate) {
      const dateKey = easternFormatter.format(game.gameDate);
      if (!gamesByDate.has(dateKey)) {
        gamesByDate.set(dateKey, []);
      }
      gamesByDate.get(dateKey)!.push(game);
    }

    console.log(`📅 ${gamesByDate.size} dates à traiter\n`);

    // 3. Mettre à jour date par date
    let totalUpdated = 0;
    let dateIndex = 0;

    for (const [dateStr, games] of gamesByDate) {
      dateIndex++;

      // Fetch scoreboard ESPN pour cette date
      const espnGames = await fetchScoreboardByDate(dateStr);

      if (espnGames.length === 0) {
        continue;
      }

      // Créer un Map pour accès rapide par ID
      const espnGamesMap = new Map(espnGames.map((g) => [g.id, g]));

      // Mettre à jour chaque match
      for (const dbGame of games) {
        const espnGame = espnGamesMap.get(dbGame.externalId);

        if (!espnGame) {
          continue;
        }

        // Parser les scores
        const competition = espnGame.competitions[0];
        const homeCompetitor = competition.competitors.find((c) => c.homeAway === "home");
        const awayCompetitor = competition.competitors.find((c) => c.homeAway === "away");

        const homeScore = homeCompetitor ? parseInt(homeCompetitor.score) : null;
        const awayScore = awayCompetitor ? parseInt(awayCompetitor.score) : null;
        const newStatus = mapGameStatus(espnGame.status.type.name);

        // Infos temps réel (pour matchs LIVE)
        const currentPeriod = espnGame.status.period || null;
        const gameClock = espnGame.status.displayClock || null;

        // Vérifier si mise à jour nécessaire
        const needsUpdate =
          newStatus !== dbGame.status ||
          homeScore !== dbGame.homeScore ||
          awayScore !== dbGame.awayScore ||
          currentPeriod !== dbGame.currentPeriod ||
          gameClock !== dbGame.gameClock;

        if (!needsUpdate) {
          continue;
        }

        // Calculer le winnerId
        let winnerId: string | null = null;
        if (newStatus === "FINAL" && homeScore !== null && awayScore !== null) {
          winnerId = homeScore > awayScore ? dbGame.homeTeamId : dbGame.awayTeamId;
        }

        // Update en DB
        await prisma.game.update({
          where: { id: dbGame.id },
          data: {
            status: newStatus,
            homeScore,
            awayScore,
            winnerId,
            currentPeriod,
            gameClock,
            updatedAt: new Date(),
          },
        });

        totalUpdated++;

        const scoreDisplay =
          homeScore !== null && awayScore !== null
            ? `${awayScore}-${homeScore}`
            : "N/A";

        console.log(
          `   ✅ ${dbGame.awayTeam.abbreviation} @ ${dbGame.homeTeam.abbreviation} → ${scoreDisplay} (${newStatus})`
        );
      }

      // Rate limiting
      if (dateIndex < gamesByDate.size) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`\n✅ ${totalUpdated} matchs mis à jour\n`);
    return totalUpdated;
  } catch (error) {
    console.error("\n❌ ERREUR lors de la mise à jour des scores:", error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CALCULATE STANDINGS
// ═══════════════════════════════════════════════════════════════════════

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
  conferenceWins: number;
  conferenceLosses: number;
  divisionWins: number;
  divisionLosses: number;
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
  teamsMap: Map<string, any>
): Promise<TeamStats> {
  const games = await prisma.game.findMany({
    where: {
      season: CURRENT_SEASON,
      status: "FINAL",
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: {
      homeTeam: { select: { conference: true, division: true } },
      awayTeam: { select: { conference: true, division: true } },
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
    conferenceWins: 0,
    conferenceLosses: 0,
    divisionWins: 0,
    divisionLosses: 0,
    currentStreak: null,
    pointsFor: 0,
    pointsAgainst: 0,
    gamesPlayed: games.length,
  };

  if (games.length === 0) {
    return stats;
  }

  // Parcourir tous les matchs
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

    // Conference W-L (match contre équipe de même conférence)
    const opponent = isHome ? game.awayTeam : game.homeTeam;
    if (opponent.conference === teamInfo.conference) {
      if (won) stats.conferenceWins++;
      else stats.conferenceLosses++;
    }

    // Division W-L (match contre équipe de même division)
    if (opponent.division === teamInfo.division) {
      if (won) stats.divisionWins++;
      else stats.divisionLosses++;
    }

    // Last 10 (si dans les 10 derniers matchs)
    if (i >= games.length - 10) {
      if (won) stats.last10Wins++;
      else stats.last10Losses++;
    }

    // Points
    stats.pointsFor += teamScore;
    stats.pointsAgainst += oppScore;
  }

  // Calculer Win%
  stats.winPct = stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0;

  // Calculer Current Streak
  let streakCount = 0;
  let streakType: "W" | "L" | null = null;

  for (let i = games.length - 1; i >= 0; i--) {
    const game = games[i];
    const isHome = game.homeTeamId === teamId;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;

    if (teamScore === null || oppScore === null) break;

    const won = teamScore > oppScore;
    const currentType: "W" | "L" = won ? "W" : "L";

    if (streakType === null) {
      streakType = currentType;
      streakCount = 1;
    } else if (currentType === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  if (streakType && streakCount > 0) {
    stats.currentStreak = `${streakType}${streakCount}`;
  }

  return stats;
}

function calculateRanks(allStats: TeamStats[]): void {
  // Conference ranks
  for (const conf of ["EAST", "WEST"]) {
    const confTeams = allStats
      .filter((s) => s.conference === conf)
      .sort((a, b) => {
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

async function calculateStandings(): Promise<void> {
  console.log("\n🏆 ÉTAPE 2 : CALCUL DES STANDINGS");
  console.log("═".repeat(80));

  try {
    // Récupérer toutes les équipes
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        conference: true,
        division: true,
      },
    });

    console.log(`📋 ${teams.length} équipes à calculer\n`);

    // Créer un map des équipes pour accès rapide
    const teamsMap = new Map(teams.map((t) => [t.id, t]));

    // Calculer les stats pour chaque équipe
    const allStats: TeamStats[] = [];

    for (const team of teams) {
      const stats = await calculateTeamStats(team.id, team, teamsMap);
      allStats.push(stats);
    }

    // Calculer les rangs
    calculateRanks(allStats);

    // Sauvegarder en DB
    for (const stats of allStats) {
      // Calculer les moyennes par match
      const pointsPerGame = stats.gamesPlayed > 0
        ? stats.pointsFor / stats.gamesPlayed
        : 0;
      const pointsAllowedPerGame = stats.gamesPlayed > 0
        ? stats.pointsAgainst / stats.gamesPlayed
        : 0;
      const pointDifferential = pointsPerGame - pointsAllowedPerGame;

      // Formater les records
      const homeRecord = `${stats.homeWins}-${stats.homeLosses}`;
      const awayRecord = `${stats.awayWins}-${stats.awayLosses}`;
      const conferenceRecord = `${stats.conferenceWins}-${stats.conferenceLosses}`;
      const divisionRecord = `${stats.divisionWins}-${stats.divisionLosses}`;
      const last10Record = `${stats.last10Wins}-${stats.last10Losses}`;

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
          pointsPerGame,
          pointsAllowedPerGame,
          pointDifferential,
          conferenceRank: stats.conferenceRank,
          divisionRank: stats.divisionRank,
          currentStreak: stats.currentStreak,
          homeRecord,
          awayRecord,
          conferenceRecord,
          divisionRecord,
          last10Record,
        },
        update: {
          wins: stats.wins,
          losses: stats.losses,
          winPct: stats.winPct,
          pointsPerGame,
          pointsAllowedPerGame,
          pointDifferential,
          conferenceRank: stats.conferenceRank,
          divisionRank: stats.divisionRank,
          currentStreak: stats.currentStreak,
          homeRecord,
          awayRecord,
          conferenceRecord,
          divisionRecord,
          last10Record,
          updatedAt: new Date(),
        },
      });
    }

    console.log(`✅ ${allStats.length} équipes sauvegardées\n`);
  } catch (error) {
    console.error("\n❌ ERREUR lors du calcul des standings:", error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n" + "═".repeat(80));
  console.log("🏀 UPDATE SCORES AND STANDINGS");
  console.log("═".repeat(80));
  console.log(`📅 Date : ${new Date().toLocaleString("fr-FR")}`);
  console.log(`🏆 Saison : ${CURRENT_SEASON}`);
  console.log("═".repeat(80));

  try {
    // Étape 1 : Mettre à jour les scores
    const updatedGames = await updateScores();

    // Étape 2 : Recalculer les standings (toujours, même si 0 matchs mis à jour)
    await calculateStandings();

    console.log("═".repeat(80));
    console.log("✅ MISE À JOUR COMPLÈTE TERMINÉE !");
    console.log("═".repeat(80));
    console.log(`📊 ${updatedGames} matchs mis à jour`);
    console.log(`🏆 Standings recalculés pour 30 équipes`);
    console.log("═".repeat(80) + "\n");
  } catch (error) {
    console.error("\n" + "═".repeat(80));
    console.error("❌ ERREUR FATALE");
    console.error("═".repeat(80));
    console.error(error);
    console.error("═".repeat(80) + "\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
