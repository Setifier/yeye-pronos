import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Fonction pour calculer si un match est un DD ou TD
// DD = 2 stats à 10+ (points, rebounds, assists, steals, blocks - pas turnovers)
// TD = 3 stats à 10+
function calculateDoubles(stats: {
  points: number;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
}): { isDoubleDouble: boolean; isTripleDouble: boolean } {
  const categories = [
    stats.points,
    stats.rebounds ?? 0,
    stats.assists ?? 0,
    stats.steals ?? 0,
    stats.blocks ?? 0,
  ];

  const doubleDigitCount = categories.filter((val) => val >= 10).length;

  return {
    isDoubleDouble: doubleDigitCount >= 2,
    isTripleDouble: doubleDigitCount >= 3,
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Vérifier que le joueur existe
    const player = await prisma.player.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }

    // Récupérer TOUTES les stats du joueur
    const stats = await prisma.gamePlayerStats.findMany({
      where: {
        playerId: id,
        points: { gt: 0 }, // Exclure les DNP (Did Not Play)
      },
      include: {
        game: {
          select: {
            id: true,
            gameDate: true,
            status: true,
            homeScore: true,
            awayScore: true,
            homeTeamId: true,
            awayTeamId: true,
            homeTeam: {
              select: {
                abbreviation: true,
              },
            },
            awayTeam: {
              select: {
                abbreviation: true,
              },
            },
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
        game: {
          gameDate: "desc",
        },
      },
    });

    if (stats.length === 0) {
      return NextResponse.json({
        player,
        stats: [],
        averages: null,
        totals: null,
        lastGames: [],
        message: "Aucune statistique disponible pour ce joueur",
      });
    }

    // Calculer les moyennes
    const gamesPlayed = stats.length;
    const totals = stats.reduce(
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
        threePointersAttempted: acc.threePointersAttempted + (stat.threePointersAttempted ?? 0),
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

    // Calculer les pourcentages
    const fgPercentage =
      totals.fieldGoalsAttempted > 0
        ? ((totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100).toFixed(1)
        : "0.0";

    const threePtPercentage =
      totals.threePointersAttempted > 0
        ? ((totals.threePointersMade / totals.threePointersAttempted) * 100).toFixed(1)
        : "0.0";

    const ftPercentage =
      totals.freeThrowsAttempted > 0
        ? ((totals.freeThrowsMade / totals.freeThrowsAttempted) * 100).toFixed(1)
        : "0.0";

    const averages = {
      gamesPlayed,
      ppg: (totals.points / gamesPlayed).toFixed(1),
      rpg: (totals.rebounds / gamesPlayed).toFixed(1),
      apg: (totals.assists / gamesPlayed).toFixed(1),
      spg: (totals.steals / gamesPlayed).toFixed(1),
      bpg: (totals.blocks / gamesPlayed).toFixed(1),
      tpg: (totals.turnovers / gamesPlayed).toFixed(1),
      fgPercentage,
      threePtPercentage,
      ftPercentage,
    };

    // Calculer les DD/TD pour tous les matchs
    let doubleDoubleCount = 0;
    let tripleDoubleCount = 0;

    stats.forEach((stat) => {
      const { isDoubleDouble, isTripleDouble } = calculateDoubles({
        points: stat.points,
        rebounds: stat.rebounds,
        assists: stat.assists,
        steals: stat.steals,
        blocks: stat.blocks,
      });
      if (isTripleDouble) {
        tripleDoubleCount++;
      } else if (isDoubleDouble) {
        doubleDoubleCount++;
      }
    });

    // Derniers 10 matchs
    const lastGames = stats.slice(0, 10).map((stat) => {
      // Déterminer l'adversaire : si le joueur était dans l'équipe home, l'adversaire est away et vice-versa
      const isHomeTeam = stat.team.id === stat.game.homeTeamId;
      const opponent = isHomeTeam
        ? stat.game.awayTeam.abbreviation
        : stat.game.homeTeam.abbreviation;

      // Calculer DD/TD pour ce match
      const { isDoubleDouble, isTripleDouble } = calculateDoubles({
        points: stat.points,
        rebounds: stat.rebounds,
        assists: stat.assists,
        steals: stat.steals,
        blocks: stat.blocks,
      });

      return {
        gameId: stat.game.id,
        gameDate: stat.game.gameDate,
        opponent,
        points: stat.points,
        rebounds: stat.rebounds,
        assists: stat.assists,
        steals: stat.steals,
        blocks: stat.blocks,
        minutes: stat.minutes,
        fieldGoals: `${stat.fieldGoalsMade ?? 0}/${stat.fieldGoalsAttempted ?? 0}`,
        threePointers: `${stat.threePointersMade ?? 0}/${stat.threePointersAttempted ?? 0}`,
        freeThrows: `${stat.freeThrowsMade ?? 0}/${stat.freeThrowsAttempted ?? 0}`,
        plusMinus: stat.plusMinus,
        isDoubleDouble,
        isTripleDouble,
      };
    });

    return NextResponse.json({
      player,
      averages,
      totals: {
        gamesPlayed,
        points: totals.points,
        rebounds: totals.rebounds,
        assists: totals.assists,
        steals: totals.steals,
        blocks: totals.blocks,
        doubleDoubles: doubleDoubleCount,
        tripleDoubles: tripleDoubleCount,
      },
      lastGames,
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
