import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PredictionResult } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Paramètres de requête
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") as PredictionResult | null; // PENDING, WON, LOST

    // Construire la condition de filtre
    const whereCondition: any = {
      userId: session.user.id,
    };

    if (filter && ["PENDING", "WON", "LOST"].includes(filter)) {
      whereCondition.result = filter;
    }

    // Récupérer les pronos avec tous les détails
    const predictions = await prisma.prediction.findMany({
      where: whereCondition,
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculer les statistiques
    const stats = await prisma.prediction.groupBy({
      by: ["result"],
      where: {
        userId: session.user.id,
      },
      _count: {
        id: true,
      },
      _sum: {
        pointsEarned: true,
      },
    });

    // Formater les stats
    const totalPredictions = predictions.length;
    const wonPredictions = stats.find((s) => s.result === "WON")?._count.id || 0;
    const lostPredictions = stats.find((s) => s.result === "LOST")?._count.id || 0;
    const pendingPredictions = stats.find((s) => s.result === "PENDING")?._count.id || 0;
    const totalPoints = stats.reduce((acc, s) => acc + (s._sum.pointsEarned || 0), 0);
    const winRate = totalPredictions > 0
      ? ((wonPredictions / (wonPredictions + lostPredictions)) * 100).toFixed(1)
      : "0.0";

    // Formater les pronos pour le frontend
    const formattedPredictions = predictions.map((pred) => {
      // Déterminer quelle équipe a été prédite
      const predictedTeam =
        pred.predictedTeamId === pred.game.homeTeamId
          ? pred.game.homeTeam
          : pred.game.awayTeam;

      return {
        id: pred.id,
        gameId: pred.gameId,
        gameDate: pred.game.gameDate,
        localGameDate: pred.game.localGameDate,
        // Format complet pour GameCard (pour les PENDING)
        game: {
          id: 0,
          dbId: pred.game.id,
          date: pred.game.localGameDate.toISOString(),
          dateUTC: pred.game.gameDate.toISOString(),
          status: pred.game.status,
          home_team: {
            id: 0,
            dbId: pred.game.homeTeam.id,
            name: pred.game.homeTeam.name,
            full_name: `${pred.game.homeTeam.city} ${pred.game.homeTeam.name}`,
            abbreviation: pred.game.homeTeam.abbreviation,
            city: pred.game.homeTeam.city,
            conference: pred.game.homeTeam.conference,
            division: pred.game.homeTeam.division,
          },
          visitor_team: {
            id: 0,
            dbId: pred.game.awayTeam.id,
            name: pred.game.awayTeam.name,
            full_name: `${pred.game.awayTeam.city} ${pred.game.awayTeam.name}`,
            abbreviation: pred.game.awayTeam.abbreviation,
            city: pred.game.awayTeam.city,
            conference: pred.game.awayTeam.conference,
            division: pred.game.awayTeam.division,
          },
          home_team_score: pred.game.homeScore,
          visitor_team_score: pred.game.awayScore,
          currentPeriod: pred.game.currentPeriod,
          gameClock: pred.game.gameClock,
        },
        homeTeam: {
          id: pred.game.homeTeam.id,
          name: pred.game.homeTeam.name,
          abbreviation: pred.game.homeTeam.abbreviation,
          logoUrl: pred.game.homeTeam.logoUrl,
        },
        awayTeam: {
          id: pred.game.awayTeam.id,
          name: pred.game.awayTeam.name,
          abbreviation: pred.game.awayTeam.abbreviation,
          logoUrl: pred.game.awayTeam.logoUrl,
        },
        predictedTeam: {
          id: predictedTeam.id,
          name: predictedTeam.name,
          abbreviation: predictedTeam.abbreviation,
        },
        homeScore: pred.game.homeScore,
        awayScore: pred.game.awayScore,
        status: pred.game.status,
        result: pred.result,
        pointsEarned: pred.pointsEarned,
        createdAt: pred.createdAt,
      };
    });

    return NextResponse.json({
      predictions: formattedPredictions,
      stats: {
        total: totalPredictions,
        won: wonPredictions,
        lost: lostPredictions,
        pending: pendingPredictions,
        winRate: parseFloat(winRate),
        totalPoints,
      },
    });
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des pronos" },
      { status: 500 }
    );
  }
}
