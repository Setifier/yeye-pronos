import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;

    // Récupérer le match avec toutes les infos
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        topScorer: {
          select: {
            id: true,
            fullName: true,
          },
        },
        playerStats: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
                lastName: true,
                position: true,
                jerseyNumber: true,
              },
            },
            team: {
              select: {
                id: true,
                abbreviation: true,
              },
            },
          },
          orderBy: {
            points: "desc", // Trier par points décroissants
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
    }

    // Si le match n'est pas terminé, pas de boxscore
    if (game.status !== "FINAL") {
      return NextResponse.json({
        game: {
          id: game.id,
          status: game.status,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          gameDate: game.gameDate,
        },
        boxscore: null,
        message: "Le match n'est pas terminé",
      });
    }

    // Séparer les stats par équipe
    const homeTeamStats = game.playerStats.filter(
      (stat) => stat.teamId === game.homeTeamId
    );

    const awayTeamStats = game.playerStats.filter(
      (stat) => stat.teamId === game.awayTeamId
    );

    // Calculer les totaux d'équipe
    const calculateTeamTotals = (stats: typeof homeTeamStats) => {
      return stats.reduce(
        (acc, stat) => ({
          points: acc.points + stat.points,
          rebounds: acc.rebounds + (stat.rebounds ?? 0),
          assists: acc.assists + (stat.assists ?? 0),
          steals: acc.steals + (stat.steals ?? 0),
          blocks: acc.blocks + (stat.blocks ?? 0),
          turnovers: acc.turnovers + (stat.turnovers ?? 0),
          fieldGoalsMade: acc.fieldGoalsMade + (stat.fieldGoalsMade ?? 0),
          fieldGoalsAttempted: acc.fieldGoalsAttempted + (stat.fieldGoalsAttempted ?? 0),
          threePointersMade: acc.threePointersMade + (stat.threePointersMade ?? 0),
          threePointersAttempted:
            acc.threePointersAttempted + (stat.threePointersAttempted ?? 0),
          freeThrowsMade: acc.freeThrowsMade + (stat.freeThrowsMade ?? 0),
          freeThrowsAttempted: acc.freeThrowsAttempted + (stat.freeThrowsAttempted ?? 0),
        }),
        {
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          turnovers: 0,
          fieldGoalsMade: 0,
          fieldGoalsAttempted: 0,
          threePointersMade: 0,
          threePointersAttempted: 0,
          freeThrowsMade: 0,
          freeThrowsAttempted: 0,
        }
      );
    };

    const homeTeamTotals = calculateTeamTotals(homeTeamStats);
    const awayTeamTotals = calculateTeamTotals(awayTeamStats);

    return NextResponse.json({
      game: {
        id: game.id,
        externalId: game.externalId,
        status: game.status,
        gameDate: game.gameDate,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        currentPeriod: game.currentPeriod,
        hasOvertime: game.hasOvertime,
        scoreMarginCategory: game.scoreMarginCategory,
        actualScoreMargin: game.actualScoreMargin,
        topScorer: game.topScorer,
        topScorerPoints: game.topScorerPoints,
      },
      boxscore: {
        homeTeam: {
          team: game.homeTeam,
          players: homeTeamStats.map((stat) => ({
            player: stat.player,
            stats: {
              minutes: stat.minutes,
              points: stat.points,
              rebounds: stat.rebounds,
              assists: stat.assists,
              steals: stat.steals,
              blocks: stat.blocks,
              turnovers: stat.turnovers,
              fieldGoals: `${stat.fieldGoalsMade ?? 0}/${stat.fieldGoalsAttempted ?? 0}`,
              threePointers: `${stat.threePointersMade ?? 0}/${stat.threePointersAttempted ?? 0}`,
              freeThrows: `${stat.freeThrowsMade ?? 0}/${stat.freeThrowsAttempted ?? 0}`,
              plusMinus: stat.plusMinus,
            },
          })),
          totals: homeTeamTotals,
        },
        awayTeam: {
          team: game.awayTeam,
          players: awayTeamStats.map((stat) => ({
            player: stat.player,
            stats: {
              minutes: stat.minutes,
              points: stat.points,
              rebounds: stat.rebounds,
              assists: stat.assists,
              steals: stat.steals,
              blocks: stat.blocks,
              turnovers: stat.turnovers,
              fieldGoals: `${stat.fieldGoalsMade ?? 0}/${stat.fieldGoalsAttempted ?? 0}`,
              threePointers: `${stat.threePointersMade ?? 0}/${stat.threePointersAttempted ?? 0}`,
              freeThrows: `${stat.freeThrowsMade ?? 0}/${stat.freeThrowsAttempted ?? 0}`,
              plusMinus: stat.plusMinus,
            },
          })),
          totals: awayTeamTotals,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching game boxscore:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du boxscore" },
      { status: 500 }
    );
  }
}
