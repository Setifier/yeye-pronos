import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/dashboard-queries";

/**
 * GET /api/dashboard/leaderboard?competitionId=xxx
 * Récupère le classement (top 10 + position utilisateur)
 * Peut filtrer par compétition si competitionId est fourni
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour accéder au classement" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer le paramètre competitionId (optionnel)
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get("competitionId") || undefined;

    // Récupérer le classement (avec ou sans filtre de compétition)
    const leaderboard = await getLeaderboard(userId, 10, competitionId);

    return NextResponse.json({
      success: true,
      ...leaderboard,
    });
  } catch (error) {
    console.error(
      "[API] Erreur lors de la récupération du classement:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
