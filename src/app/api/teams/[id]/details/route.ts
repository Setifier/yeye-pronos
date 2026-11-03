import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const season = getCurrentSeason();

    // Fetch team with stats, roster, and injuries
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        city: true,
        abbreviation: true,
        logoUrl: true,
        conference: true,
        division: true,
        primaryColor: true,
        secondaryColor: true,
        seasonStats: {
          where: { season },
          select: {
            // Record
            wins: true,
            losses: true,
            winPct: true,
            conferenceRank: true,
            divisionRank: true,

            // Records splits
            homeRecord: true,
            awayRecord: true,
            conferenceRecord: true,
            divisionRecord: true,
            last10Record: true,
            currentStreak: true,

            // Averages
            pointsPerGame: true,
            pointsAllowedPerGame: true,
            pointDifferential: true,
            reboundsPerGame: true,
            assistsPerGame: true,
            stealsPerGame: true,
            blocksPerGame: true,
            turnoversPerGame: true,

            // Shooting
            fieldGoalPct: true,
            threePointPct: true,
            freeThrowPct: true,
          },
        },
        players: {
          select: {
            id: true,
            fullName: true,
            position: true,
            jerseyNumber: true,
            height: true,
            weight: true,
            country: true,
            headshot: true,
            injuryStatus: true,
            injuryNote: true,
            seasonStats: {
              where: { season },
              select: {
                gamesPlayed: true,
                pointsPerGame: true,
                reboundsPerGame: true,
                assistsPerGame: true,
                stealsPerGame: true,
                blocksPerGame: true,
                turnoversPerGame: true,
                fieldGoalPct: true,
                threePointPct: true,
                freeThrowPct: true,
                totalPoints: true,
                totalRebounds: true,
                totalAssists: true,
                doubleDoubles: true,
                tripleDoubles: true,
              },
            },
          },
          orderBy: [
            { fullName: "asc" },
          ],
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Équipe introuvable" },
        { status: 404 }
      );
    }

    // Récupérer TOUTES les équipes pour calculer les rankings
    const allTeams = await prisma.team.findMany({
      select: {
        id: true,
        seasonStats: {
          where: { season },
          select: {
            pointsPerGame: true,
            pointsAllowedPerGame: true,
          },
        },
      },
    });

    // Récupérer les stats de tous les matchs terminés avec les stats joueurs par équipe
    const allGamesWithStats = await prisma.game.findMany({
      where: {
        status: "FINAL",
      },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        playerStats: {
          select: {
            teamId: true,
            points: true,
            rebounds: true,
            assists: true,
            steals: true,
            blocks: true,
            turnovers: true,
            fieldGoalsMade: true,
            fieldGoalsAttempted: true,
            threePointersMade: true,
            threePointersAttempted: true,
            freeThrowsMade: true,
            freeThrowsAttempted: true,
          },
        },
      },
    });

    // Calculer les stats pour chaque équipe
    const teamStatsMap: Map<string, {
      gamesCount: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      fgMade: number;
      fgAttempted: number;
      threeMade: number;
      threeAttempted: number;
      ftMade: number;
      ftAttempted: number;
    }> = new Map();

    // Initialiser toutes les équipes
    allTeams.forEach((t) => {
      teamStatsMap.set(t.id, {
        gamesCount: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fgMade: 0,
        fgAttempted: 0,
        threeMade: 0,
        threeAttempted: 0,
        ftMade: 0,
        ftAttempted: 0,
      });
    });

    // Agréger les stats par équipe
    allGamesWithStats.forEach((game) => {
      const teamsInGame = new Set<string>();

      game.playerStats.forEach((stat) => {
        const teamStats = teamStatsMap.get(stat.teamId);
        if (teamStats) {
          teamsInGame.add(stat.teamId);
          teamStats.rebounds += stat.rebounds ?? 0;
          teamStats.assists += stat.assists ?? 0;
          teamStats.steals += stat.steals ?? 0;
          teamStats.blocks += stat.blocks ?? 0;
          teamStats.turnovers += stat.turnovers ?? 0;
          teamStats.fgMade += stat.fieldGoalsMade ?? 0;
          teamStats.fgAttempted += stat.fieldGoalsAttempted ?? 0;
          teamStats.threeMade += stat.threePointersMade ?? 0;
          teamStats.threeAttempted += stat.threePointersAttempted ?? 0;
          teamStats.ftMade += stat.freeThrowsMade ?? 0;
          teamStats.ftAttempted += stat.freeThrowsAttempted ?? 0;
        }
      });

      // Incrémenter le nombre de matchs pour chaque équipe présente
      teamsInGame.forEach((tId) => {
        const teamStats = teamStatsMap.get(tId);
        if (teamStats) {
          teamStats.gamesCount++;
        }
      });
    });

    // Calculer les moyennes pour chaque équipe
    const allTeamAverages: Array<{
      teamId: string;
      pointsPerGame: number;
      pointsAllowedPerGame: number;
      reboundsPerGame: number;
      assistsPerGame: number;
      stealsPerGame: number;
      blocksPerGame: number;
      turnoversPerGame: number;
      fieldGoalPct: number | null;
      threePointPct: number | null;
      freeThrowPct: number | null;
    }> = [];

    allTeams.forEach((t) => {
      const stats = teamStatsMap.get(t.id);
      const seasonStats = t.seasonStats[0];
      if (stats && stats.gamesCount > 0) {
        allTeamAverages.push({
          teamId: t.id,
          pointsPerGame: seasonStats?.pointsPerGame ?? 0,
          pointsAllowedPerGame: seasonStats?.pointsAllowedPerGame ?? 0,
          reboundsPerGame: stats.rebounds / stats.gamesCount,
          assistsPerGame: stats.assists / stats.gamesCount,
          stealsPerGame: stats.steals / stats.gamesCount,
          blocksPerGame: stats.blocks / stats.gamesCount,
          turnoversPerGame: stats.turnovers / stats.gamesCount,
          fieldGoalPct: stats.fgAttempted > 0 ? stats.fgMade / stats.fgAttempted : null,
          threePointPct: stats.threeAttempted > 0 ? stats.threeMade / stats.threeAttempted : null,
          freeThrowPct: stats.ftAttempted > 0 ? stats.ftMade / stats.ftAttempted : null,
        });
      }
    });

    // Fonction pour calculer le rang (1st, 2nd, etc.)
    // higherIsBetter = true pour la plupart des stats, false pour turnovers et points encaissés
    const getRank = (teamId: string, stat: keyof typeof allTeamAverages[0], higherIsBetter: boolean = true): number => {
      const sorted = [...allTeamAverages]
        .filter((t) => t[stat] !== null)
        .sort((a, b) => {
          const aVal = a[stat] as number;
          const bVal = b[stat] as number;
          return higherIsBetter ? bVal - aVal : aVal - bVal;
        });

      const index = sorted.findIndex((t) => t.teamId === teamId);
      return index >= 0 ? index + 1 : 0;
    };

    // Trouver les stats de l'équipe actuelle
    const currentTeamStats = allTeamAverages.find((t) => t.teamId === teamId);

    // Calculer les rankings pour l'équipe actuelle
    const rankings = currentTeamStats ? {
      pointsPerGameRank: getRank(teamId, "pointsPerGame", true),
      pointsAllowedPerGameRank: getRank(teamId, "pointsAllowedPerGame", false), // moins = mieux
      reboundsPerGameRank: getRank(teamId, "reboundsPerGame", true),
      assistsPerGameRank: getRank(teamId, "assistsPerGame", true),
      stealsPerGameRank: getRank(teamId, "stealsPerGame", true),
      blocksPerGameRank: getRank(teamId, "blocksPerGame", true),
      turnoversPerGameRank: getRank(teamId, "turnoversPerGame", false), // moins = mieux
      fieldGoalPctRank: getRank(teamId, "fieldGoalPct", true),
      threePointPctRank: getRank(teamId, "threePointPct", true),
      freeThrowPctRank: getRank(teamId, "freeThrowPct", true),
    } : null;

    // Fusionner les stats calculées avec les stats existantes
    const enrichedTeam = {
      ...team,
      seasonStats: team.seasonStats.map((stats) => ({
        ...stats,
        reboundsPerGame: currentTeamStats?.reboundsPerGame ?? stats.reboundsPerGame,
        assistsPerGame: currentTeamStats?.assistsPerGame ?? stats.assistsPerGame,
        stealsPerGame: currentTeamStats?.stealsPerGame ?? stats.stealsPerGame,
        blocksPerGame: currentTeamStats?.blocksPerGame ?? stats.blocksPerGame,
        turnoversPerGame: currentTeamStats?.turnoversPerGame ?? stats.turnoversPerGame,
        fieldGoalPct: currentTeamStats?.fieldGoalPct ?? stats.fieldGoalPct,
        threePointPct: currentTeamStats?.threePointPct ?? stats.threePointPct,
        freeThrowPct: currentTeamStats?.freeThrowPct ?? stats.freeThrowPct,
        // Rankings
        ...rankings,
      })),
    };

    return NextResponse.json({ team: enrichedTeam });
  } catch (error) {
    console.error("Error fetching team details:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
