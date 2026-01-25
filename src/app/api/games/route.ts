import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Route API pour récupérer les matchs par date
 * Lit depuis la base de données Prisma (pas d'appel à BallDontLie)
 *
 * Query params:
 * - date: Date au format YYYY-MM-DD (requis)
 *
 * Example: /api/games?date=2025-01-15
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "Date parameter is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Vérifier l'authentification (optionnel)
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    const userId = session?.user?.id;

    console.log(`[API] Querying DB for games on date: ${dateParam}`);

    // Parser la date (format: "2025-12-22")
    const [year, month, day] = dateParam.split("-").map(Number);

    // Valider la date
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Chercher sur une plage large pour capturer tous les matchs
    // du jour demandé, quel que soit le fuseau horaire
    // On cherche 12h avant et 36h après pour être sûr
    const startDate = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0));

    // Récupérer les matchs depuis la base de données
    const dbGames = await prisma.game.findMany({
      where: {
        localGameDate: {
          gte: startDate,
          lte: endDate,
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
              where: {
                userId: userId,
              },
              select: {
                id: true,
                predictedTeamId: true,
              },
            }
          : false,
      },
      orderBy: {
        gameDate: "asc",
      },
    });

    console.log(`[API] Found ${dbGames.length} games in wide search for ${dateParam}`);

    // Filtrer pour ne garder que les matchs qui correspondent au jour demandé
    // UNIQUEMENT selon la date locale US (Eastern Time), PAS l'heure de Paris
    const filteredGames = dbGames.filter((game) => {
      // Convertir gameDate (UTC) en date locale US (Eastern Time)
      const usDateStr = game.gameDate.toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      // Format: "MM/DD/YYYY" -> convertir en "YYYY-MM-DD"
      const [month, day, year] = usDateStr.split("/");
      const formattedUsDate = `${year}-${month}-${day}`;

      return formattedUsDate === dateParam;
    });

    console.log(`[API] Filtered to ${filteredGames.length} games matching ${dateParam} (US date)`);

    // Formater les matchs pour correspondre au format attendu par le frontend
    // (format compatible avec BallDontLie pour éviter de casser le frontend)
    const games = filteredGames.map((game) => {
      const userPrediction =
        game.predictions && game.predictions.length > 0
          ? {
              predictedTeamId: game.predictions[0].predictedTeamId,
            }
          : null;

      return {
        id: parseInt(game.externalId),
        dbId: game.id, // UUID réel pour les prédictions
        date: game.localGameDate.toISOString(), // Date locale US
        dateUTC: game.gameDate.toISOString(), // Date UTC réelle (pour conversions)
        status: game.status,
        home_team: {
          id: parseInt(game.homeTeam.externalId),
          dbId: game.homeTeam.id, // UUID réel de l'équipe
          name: game.homeTeam.name,
          full_name: `${game.homeTeam.city} ${game.homeTeam.name}`,
          abbreviation: game.homeTeam.abbreviation,
          city: game.homeTeam.city,
          conference: game.homeTeam.conference === "EAST" ? "East" : "West",
          division: game.homeTeam.division,
        },
        visitor_team: {
          id: parseInt(game.awayTeam.externalId),
          dbId: game.awayTeam.id, // UUID réel de l'équipe
          name: game.awayTeam.name,
          full_name: `${game.awayTeam.city} ${game.awayTeam.name}`,
          abbreviation: game.awayTeam.abbreviation,
          city: game.awayTeam.city,
          conference: game.awayTeam.conference === "EAST" ? "East" : "West",
          division: game.awayTeam.division,
        },
        home_team_score: game.homeScore,
        visitor_team_score: game.awayScore,
        currentPeriod: game.currentPeriod,
        gameClock: game.gameClock,
        userPrediction,
      };
    });

    return NextResponse.json({ games });
  } catch (error) {
    console.error("[API] Error fetching games:", error);

    if (error instanceof Error) {
      console.error("[API] Error details:", error.message);
    }

    return NextResponse.json(
      {
        games: [],
        error: "Failed to fetch games from database",
      },
      { status: 500 }
    );
  }
}
