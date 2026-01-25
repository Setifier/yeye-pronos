import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Récupérer la session (optionnel pour le classement, mais utile pour highlight)
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Récupérer tous les utilisateurs avec leurs pronos
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        predictions: {
          select: {
            result: true,
            pointsEarned: true,
          },
        },
      },
    });

    // Calculer les stats pour chaque utilisateur
    const usersWithStats = users
      .map((user) => {
        const totalPredictions = user.predictions.length;
        const wonPredictions = user.predictions.filter((p) => p.result === "WON").length;
        const lostPredictions = user.predictions.filter((p) => p.result === "LOST").length;
        const pendingPredictions = user.predictions.filter((p) => p.result === "PENDING").length;
        const totalPoints = user.predictions.reduce((acc, p) => acc + p.pointsEarned, 0);

        const finishedPredictions = wonPredictions + lostPredictions;
        const winRate = finishedPredictions > 0
          ? ((wonPredictions / finishedPredictions) * 100).toFixed(1)
          : "0.0";

        return {
          id: user.id,
          name: user.name,
          image: user.image,
          totalPredictions,
          wonPredictions,
          lostPredictions,
          pendingPredictions,
          totalPoints,
          winRate: parseFloat(winRate),
        };
      })
      // Filtrer les utilisateurs qui n'ont pas de pronos
      .filter((user) => user.totalPredictions > 0)
      // Trier par points décroissants, puis par win rate si égalité
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.winRate - a.winRate;
      });

    // Ajouter les rangs
    const leaderboard = usersWithStats.map((user, index) => ({
      rank: index + 1,
      ...user,
      isCurrentUser: session?.user ? user.id === session.user.id : false,
    }));

    // Trouver la position de l'utilisateur connecté
    const currentUserRank = session?.user
      ? leaderboard.find((u) => u.id === session.user.id)?.rank || null
      : null;

    return NextResponse.json({
      leaderboard,
      currentUserRank,
      totalPlayers: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du classement" },
      { status: 500 }
    );
  }
}
