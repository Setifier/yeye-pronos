import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/badges
 * Récupérer tous les badges disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    // Construire les filtres
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (type) {
      where.type = type;
    }

    const badges = await prisma.badge.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { type: "asc" },
        { difficultyLevel: "asc" },
      ],
    });

    // Grouper par catégorie
    const grouped = {
      SEASON: badges.filter((b) => b.category === "SEASON"),
      END_SEASON: badges.filter((b) => b.category === "END_SEASON"),
      CAREER: badges.filter((b) => b.category === "CAREER"),
    };

    return NextResponse.json({
      badges,
      grouped,
      total: badges.length,
    });
  } catch (error) {
    console.error("[API] Error fetching badges:", error);
    return NextResponse.json(
      { error: "Error fetching badges" },
      { status: 500 }
    );
  }
}
