import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayoffBracket } from "@/lib/playoff-series";
import { getCurrentSeason } from "@/types/season";

/**
 * GET /api/playoffs/bracket?season=2025-26
 *
 * Returns all playoff series for the given season (defaults to current season),
 * sorted by round then creation date. Includes full series data with team info
 * and game results.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const season = searchParams.get("season") ?? getCurrentSeason();

    const bracket = await getPlayoffBracket(season, prisma);

    return NextResponse.json({ season, bracket });
  } catch (error) {
    console.error("[API] Error fetching playoff bracket:", error);
    return NextResponse.json(
      { error: "Failed to fetch playoff bracket" },
      { status: 500 }
    );
  }
}
