import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateAllStandings } from "@/lib/standings-calculator";
import { getGamesByDate } from "@/lib/espn";
import { getCurrentSeason } from "@/types/season";

/**
 * POST /api/admin/recalculate-standings
 *
 * Admin-only endpoint:
 * 1. Updates status/scores for any SCHEDULED/LIVE regular-season games
 *    that are in the past (fetches from ESPN scoreboard — no boxscores).
 * 2. Recalculates standings for all 30 teams.
 *
 * Body: { season?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (userRecord?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const season = (body as { season?: string }).season ?? getCurrentSeason();

    console.log(`[ADMIN STANDINGS] Starting recalculation for season ${season}...`);

    // ── 1. Update pending game statuses ───────────────────────────────────────
    const pendingGames = await prisma.game.findMany({
      where: {
        season,
        seasonType: "Regular Season",
        status: { in: ["SCHEDULED", "LIVE"] },
        gameDate: { lt: new Date() },
      },
      orderBy: { gameDate: "asc" },
      select: {
        id: true,
        externalId: true,
        gameDate: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    console.log(`[ADMIN STANDINGS] Found ${pendingGames.length} pending games`);

    // Group by ESPN date
    const dateMap = new Map<string, typeof pendingGames>();
    for (const game of pendingGames) {
      const espnDate = game.gameDate.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
      if (!dateMap.has(espnDate)) dateMap.set(espnDate, []);
      dateMap.get(espnDate)!.push(game);
    }

    let updatedGames = 0;
    let finalizedGames = 0;

    for (const [dateStr, gamesForDate] of dateMap) {
      const espnDateStr = dateStr.replace(/-/g, "");
      let espnGames;
      try {
        const response = await getGamesByDate(espnDateStr);
        espnGames = response.events;
      } catch {
        console.error(`[ADMIN STANDINGS] ESPN fetch failed for ${dateStr}`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      const espnMap = new Map(espnGames.map((g) => [g.id, g]));

      for (const dbGame of gamesForDate) {
        const espnGame = espnMap.get(dbGame.externalId);
        if (!espnGame) continue;

        const competition = espnGame.competitions[0];
        if (!competition) continue;

        const statusName = competition.status.type.name.toUpperCase();
        let newStatus: "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED" = "SCHEDULED";
        if (statusName.includes("FINAL")) newStatus = "FINAL";
        else if (statusName.includes("PROGRESS") || statusName.includes("LIVE")) newStatus = "LIVE";
        else if (statusName.includes("POSTPONED")) newStatus = "POSTPONED";
        else if (statusName.includes("CANCELLED") || statusName.includes("CANCELED")) newStatus = "CANCELLED";

        const homeComp = competition.competitors.find((c) => c.homeAway === "home");
        const awayComp = competition.competitors.find((c) => c.homeAway === "away");
        const homeScore = homeComp?.score ? parseInt(homeComp.score) : null;
        const awayScore = awayComp?.score ? parseInt(awayComp.score) : null;

        let winnerId: string | null = null;
        if (newStatus === "FINAL" && homeScore !== null && awayScore !== null) {
          winnerId = homeScore > awayScore ? dbGame.homeTeamId : dbGame.awayTeamId;
        }

        await prisma.game.update({
          where: { id: dbGame.id },
          data: { status: newStatus, homeScore, awayScore, winnerId },
        });

        updatedGames++;
        if (newStatus === "FINAL") finalizedGames++;
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[ADMIN STANDINGS] Updated ${updatedGames} games, ${finalizedGames} finalized`);

    // ── 2. Recalculate standings for all teams ─────────────────────────────────
    await recalculateAllStandings(season);

    console.log("[ADMIN STANDINGS] Done.");

    return NextResponse.json({
      success: true,
      season,
      gamesUpdated: updatedGames,
      gamesFinalized: finalizedGames,
      message: "Standings recalculated for all 30 teams.",
    });
  } catch (error) {
    console.error("[ADMIN STANDINGS] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to recalculate standings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
