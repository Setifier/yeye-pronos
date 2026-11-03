import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const injuredOnly = searchParams.get("injured") === "true";
    // Par défaut : joueurs sous contrat uniquement (la DB garde aussi agents libres et anciens joueurs)
    const includeFreeAgents = searchParams.get("all") === "true";

    const players = await prisma.player.findMany({
      where: {
        ...(includeFreeAgents ? {} : { teamId: { not: null } }),
        ...(injuredOnly ? { isInjured: true } : {}),
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
          },
        },
      },
      orderBy: {
        lastName: "asc",
      },
    });

    return NextResponse.json({
      players,
      count: players.length,
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
