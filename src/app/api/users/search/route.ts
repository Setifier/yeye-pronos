import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Users Search: Rechercher des utilisateurs
 * GET /api/users/search?q=xxx
 *
 * Query params:
 * - q: string (terme de recherche, min 2 caractères)
 *
 * Recherche par nom ou friendCode (ex: #A7K3M)
 * Exclut l'utilisateur connecté des résultats
 * Limite à 20 résultats
 *
 * Protégé: Authentification requise
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer le paramètre de recherche
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    // Validation: minimum 2 caractères
    if (query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Rechercher les utilisateurs
    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Exclure soi-même
          { id: { not: userId } },
          // Recherche par nom ou friendCode
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { friendCode: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        friendCode: true,
      },
      take: 20,
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      users,
      query,
    });
  } catch (error) {
    console.error("[API Users Search] Error:", error);

    return NextResponse.json(
      {
        error: "Error searching users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
