import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserStats } from "@/lib/dashboard-queries";

/**
 * GET /api/dashboard/stats
 * Récupère les statistiques de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour accéder à vos statistiques" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer les statistiques
    const stats = await getUserStats(userId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[API] Erreur lors de la récupération des stats:", error);

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
