import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        abbreviation: true,
        logoUrl: true,
        conference: true,
        primaryColor: true,
        secondaryColor: true,
        seasonStats: {
          where: { season: "2025-26" },
          select: {
            wins: true,
            losses: true,
            winPct: true,
            conferenceRank: true,
            divisionRank: true,
            homeRecord: true,
            awayRecord: true,
            conferenceRecord: true,
            divisionRecord: true,
            last10Record: true,
            currentStreak: true,
          },
        },
      },
      orderBy: [{ conference: "asc" }, { city: "asc" }],
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
