import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadBetGames } from "@/lib/bet-games";
import { getCurrentNightDate } from "@/lib/game-night";

export const dynamic = "force-dynamic";

/**
 * GET /api/bets?date=YYYY-MM-DD   → matchs d'une nuit NBA (date US Eastern)
 * GET /api/bets?month=YYYY-MM     → toutes les nuits du mois (+ mois disponibles)
 *
 * Format BetGame, avec le prono de l'utilisateur connecté (connexion facultative).
 */
export async function GET(request: NextRequest) {
  const date  = request.nextUrl.searchParams.get("date");
  const month = request.nextUrl.searchParams.get("month");

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date attendue au format YYYY-MM-DD" }, { status: 400 });
  }
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month attendu au format YYYY-MM" }, { status: 400 });
  }
  if (!date && !month) {
    return NextResponse.json({ error: "Paramètre date ou month requis" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id ?? null;

    if (date) {
      const games = await loadBetGames(prisma, [date], userId);
      return NextResponse.json({ date, games, serverTime: new Date().toISOString() });
    }

    // Toutes les nuits du mois demandé
    const [y, m] = month!.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const nights = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
    const games = await loadBetGames(prisma, nights, userId);

    // Mois disponibles (avec au moins un prono de l'utilisateur, sinon avec des matchs)
    const monthsRows = userId
      ? await prisma.$queryRaw<{ month: string }[]>`
          SELECT DISTINCT to_char((g."gameDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York', 'YYYY-MM') AS month
          FROM predictions p JOIN games g ON g.id = p."gameId"
          WHERE p."userId" = ${userId}
          ORDER BY month DESC`
      : [];
    const current = getCurrentNightDate().slice(0, 7);
    const availableMonths = [...new Set([current, ...monthsRows.map((r) => r.month)])].sort().reverse();

    return NextResponse.json({ month, games, availableMonths, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[API bets]", error);
    return NextResponse.json({ error: "Erreur serveur", games: [] }, { status: 500 });
  }
}
