import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecentPredictions } from "@/lib/dashboard-queries";

/**
 * GET /api/dashboard/recent-predictions?limit=10
 * Récupère les derniers pronos de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error:
            "Vous devez être connecté pour accéder à vos pronos récents",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer le paramètre limit (par défaut 10)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Valider le limit (max 50)
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "Le paramètre limit doit être entre 1 et 50" },
        { status: 400 }
      );
    }

    // Récupérer les pronos récents
    const predictions = await getRecentPredictions(userId, limit);

    return NextResponse.json({
      success: true,
      predictions,
    });
  } catch (error) {
    console.error(
      "[API] Erreur lors de la récupération des pronos récents:",
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
