import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/games/month?month=2025-01
 * Récupérer tous les matchs d'un mois donné + les mois disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // format: YYYY-MM

    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    const userId = session?.user?.id;

    // Récupérer les mois disponibles (distinct des gameDate)
    const allGames = await prisma.game.findMany({
      select: { gameDate: true },
      orderBy: { gameDate: "asc" },
    });

    // Extraire les mois uniques en US Eastern Time
    const monthsSet = new Set<string>();
    for (const g of allGames) {
      const usDate = g.gameDate.toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
      });
      // Format "MM/YYYY" -> "YYYY-MM"
      const [mm, yyyy] = usDate.split("/");
      monthsSet.add(`${yyyy}-${mm}`);
    }
    const availableMonths = Array.from(monthsSet).sort().reverse();

    // Si pas de mois spécifié, utiliser le mois en cours
    const now = new Date();
    const currentMonth = monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Parser le mois
    const [year, month] = currentMonth.split("-").map(Number);

    // Plage pour le mois (large pour capturer tous les fuseaux)
    const startDate = new Date(Date.UTC(year, month - 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));

    // Récupérer les matchs du mois
    const dbGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: startDate,
          lte: endDate,
        },
        // Masquer les matchs if-necessary annulés (série terminée avant qu'ils soient joués)
        NOT: {
          AND: [{ isIfNecessary: true }, { status: "CANCELLED" }],
        },
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            externalId: true,
            name: true,
            city: true,
            abbreviation: true,
            conference: true,
            division: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            externalId: true,
            name: true,
            city: true,
            abbreviation: true,
            conference: true,
            division: true,
          },
        },
        predictions: userId
          ? {
              where: { userId },
              select: {
                id: true,
                predictedTeamId: true,
                result: true,
                pointsEarned: true,
              },
            }
          : false,
      },
      orderBy: {
        gameDate: "asc",
      },
    });

    // Filtrer pour ne garder que les matchs du mois demandé (Eastern Time)
    const filteredGames = dbGames.filter((game) => {
      const usDateStr = game.gameDate.toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
      });
      const [mm, yyyy] = usDateStr.split("/");
      return `${yyyy}-${mm}` === currentMonth;
    });

    // Récupérer la date d'inscription de l'utilisateur
    let userCreatedAt: Date | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      userCreatedAt = user?.createdAt ?? null;
    }

    // Formater les matchs
    const games = filteredGames.map((game) => {
      const prediction = game.predictions && game.predictions.length > 0
        ? game.predictions[0]
        : null;

      const userPrediction = prediction
        ? {
            predictedTeamId: prediction.predictedTeamId,
            result: prediction.result,
            pointsEarned: prediction.pointsEarned,
          }
        : null;

      return {
        id: parseInt(game.externalId),
        dbId: game.id,
        date: game.localGameDate.toISOString(),
        dateUTC: game.gameDate.toISOString(),
        status: game.status,
        home_team: {
          id: parseInt(game.homeTeam.externalId),
          dbId: game.homeTeam.id,
          name: game.homeTeam.name,
          full_name: `${game.homeTeam.city} ${game.homeTeam.name}`,
          abbreviation: game.homeTeam.abbreviation,
          city: game.homeTeam.city,
          conference: game.homeTeam.conference === "EAST" ? "East" : "West",
          division: game.homeTeam.division,
        },
        visitor_team: {
          id: parseInt(game.awayTeam.externalId),
          dbId: game.awayTeam.id,
          name: game.awayTeam.name,
          full_name: `${game.awayTeam.city} ${game.awayTeam.name}`,
          abbreviation: game.awayTeam.abbreviation,
          city: game.awayTeam.city,
          conference: game.awayTeam.conference === "EAST" ? "East" : "West",
          division: game.awayTeam.division,
        },
        home_team_score:   game.homeScore,
        visitor_team_score: game.awayScore,
        currentPeriod:     game.currentPeriod,
        gameClock:         game.gameClock,
        isIfNecessary:     game.isIfNecessary,
        gameNumber:        game.gameNumber,
        seriesId:          game.seriesId,
        seasonType:        game.seasonType,
        userPrediction,
      };
    });

    return NextResponse.json({
      games,
      currentMonth,
      availableMonths,
      userCreatedAt: userCreatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[API] Error fetching month games:", error);
    return NextResponse.json(
      { games: [], availableMonths: [], error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
