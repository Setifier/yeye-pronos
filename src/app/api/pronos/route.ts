import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PredictionResult } from "@/generated/prisma";
import { getCurrentSeason } from "@/types/season";

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
    // Saison : en cours par défaut, "all" pour toutes les saisons
    const seasonParam = searchParams.get("season");
    const season = seasonParam === "all" ? null : seasonParam ?? getCurrentSeason();
    // statsOnly : seulement les statistiques (évite de renvoyer tout l'historique)
    const statsOnly = searchParams.get("statsOnly") === "1" || searchParams.get("statsOnly") === "true";

    // Construire la condition de filtre
    const whereCondition: Record<string, unknown> = {
      userId: session.user.id,
      ...(season ? { game: { season } } : {}),
    };

    if (filter && ["PENDING", "WON", "LOST", "CANCELLED"].includes(filter)) {
      whereCondition.result = filter;
    }

    // Récupérer les pronos avec tous les détails (incluant bonus)
    const predictions = statsOnly ? [] : await prisma.prediction.findMany({
      where: whereCondition,
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
            topScorer: {
              select: {
                id: true,
                fullName: true,
                headshot: true,
              },
            },
          },
        },
        predictedTopScorer: {
          select: {
            id: true,
            fullName: true,
            headshot: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculer les statistiques détaillées (même périmètre de saison)
    const allPredictions = await prisma.prediction.findMany({
      where: { userId: session.user.id, ...(season ? { game: { season } } : {}) },
      select: {
        result: true,
        pointsEarned: true,
        marginBonusPoints: true,
        topScorerBonusPoints: true,
        comboBonusPoints: true,
      },
    });

    const wonPredictions = allPredictions.filter((p) => p.result === "WON").length;
    const lostPredictions = allPredictions.filter((p) => p.result === "LOST").length;
    const totalPoints = allPredictions.reduce((acc, p) => acc + p.pointsEarned, 0);
    const winRate = (wonPredictions + lostPredictions) > 0
      ? ((wonPredictions / (wonPredictions + lostPredictions)) * 100).toFixed(1)
      : "0.0";
    const bonEcart = allPredictions.filter((p) => (p.marginBonusPoints ?? 0) > 0).length;
    const topScorer = allPredictions.filter((p) => (p.topScorerBonusPoints ?? 0) > 0).length;
    const comboUltime = allPredictions.filter((p) => (p.comboBonusPoints ?? 0) > 0).length;

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
        // Bonus details
        predictedScoreMargin: pred.predictedScoreMargin,
        actualScoreMargin: pred.game.scoreMarginCategory,
        marginBonusPoints: pred.marginBonusPoints,
        predictedTopScorer: pred.predictedTopScorer,
        actualTopScorer: pred.game.topScorer,
        actualTopScorerPoints: pred.game.topScorerPoints,
        topScorerBonusPoints: pred.topScorerBonusPoints,
        comboBonusPoints: pred.comboBonusPoints,
      };
    });

    return NextResponse.json({
      predictions: formattedPredictions,
      stats: {
        won: wonPredictions,
        lost: lostPredictions,
        winRate: parseFloat(winRate),
        bonEcart,
        topScorer,
        comboUltime,
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
