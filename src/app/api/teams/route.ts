import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const season = getCurrentSeason();
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
          where: { season },
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
