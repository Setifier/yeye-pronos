import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pronos/day-stats?date=YYYY-MM-DD
 * Récupérer les stats des pronos pour une journée spécifique
 *
 * Utilise le fuseau US Eastern Time pour filtrer les matchs (comme /api/games)
 * Après la date d'inscription de l'utilisateur, les matchs sans prono
 * comptent comme des ratés pour le win rate
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "date est requis (format YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const [year, month, day] = dateParam.split("-").map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return NextResponse.json(
        { error: "Format de date invalide. Utiliser YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Même logique que /api/games : plage large UTC puis filtrage par date US Eastern
    const startDate = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0));

    // Récupérer TOUS les matchs FINAL de la journée (pas seulement ceux avec prono)
    const allGames = await prisma.game.findMany({
      where: {
        localGameDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        gameDate: true,
        status: true,
        predictions: {
          where: { userId },
          select: {
            result: true,
            pointsEarned: true,
            predictedTeamId: true,
          },
        },
      },
    });

    // Filtrer par date US Eastern Time (comme /api/games)
    const dayGames = allGames.filter((game) => {
      const usDateStr = game.gameDate.toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const [m, d, y] = usDateStr.split("/");
      return `${y}-${m}-${d}` === dateParam;
    });

    // Ne compter que les matchs terminés
    const finalGames = dayGames.filter((g) => g.status === "FINAL");

    // Récupérer la date d'inscription de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : null;

    // Vérifier si cette date est après l'inscription
    const dayDate = new Date(year, month - 1, day);
    const isAfterRegistration = userCreatedAt ? dayDate >= new Date(
      userCreatedAt.getFullYear(),
      userCreatedAt.getMonth(),
      userCreatedAt.getDate()
    ) : false;

    // Calculer les stats
    let won = 0;
    let lost = 0;
    let noPrediction = 0;
    let totalPoints = 0;
    let pending = 0;

    for (const game of finalGames) {
      const prediction = game.predictions[0];
      if (prediction) {
        if (prediction.result === "WON") won++;
        else if (prediction.result === "LOST") lost++;
        else if (prediction.result === "PENDING") pending++;
        totalPoints += prediction.pointsEarned;
      } else {
        // Pas de prono sur ce match
        noPrediction++;
      }
    }

    // Après inscription, les matchs sans prono comptent comme des ratés
    const effectiveLost = isAfterRegistration ? lost + noPrediction : lost;
    const totalDecided = won + effectiveLost;
    const winRate = totalDecided > 0 ? Math.round((won / totalDecided) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        total: finalGames.length,
        won,
        lost: effectiveLost,
        noPrediction,
        pending,
        totalPoints,
        winRate,
        isAfterRegistration,
      },
    });
  } catch (error) {
    console.error("[API] Erreur lors de la récupération des stats du jour:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
