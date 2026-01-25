import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Admin: Gestion des utilisateurs
 * GET /api/admin/users
 *
 * Query params:
 * - search: string (recherche nom/email)
 * - role: "USER" | "ADMIN" (filtre par rôle)
 * - page: number (page actuelle, défaut 1)
 * - limit: number (résultats par page, défaut 20)
 *
 * Retourne la liste paginée des utilisateurs avec:
 * - Infos de base (id, name, email, role, banned, createdAt)
 * - Compteurs (pronos, badges)
 * - Métadonnées de pagination
 *
 * Protégé: ADMIN uniquement
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Récupérer les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role"); // "USER" | "ADMIN" | null
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validation des paramètres
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Construire les conditions de filtrage
    const where: any = {};

    // Filtre de recherche (nom ou email)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filtre par rôle
    if (role && (role === "USER" || role === "ADMIN")) {
      where.role = role;
    }

    // Requêtes en parallèle pour performance
    const [users, total] = await Promise.all([
      // Liste des users avec infos + compteurs
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          banned: true,
          banReason: true,
          banExpires: true,
          createdAt: true,
          emailVerified: true,
          _count: {
            select: {
              predictions: true,
              badges: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),

      // Total pour pagination
      prisma.user.count({ where }),
    ]);

    // Formater les résultats
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      predictions: user._count.predictions,
      badges: user._count.badges,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API Admin Users] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
