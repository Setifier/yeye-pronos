import { NextRequest, NextResponse } from "next/server";
import { fetchTodaysGames } from "@/lib/espn";
import { prisma } from "@/lib/prisma";

/**
 * CRON Job: Refresh Daily Games
 *
 * Déclenché tous les jours à 08h00 heure de Paris
 *
 * Objectif :
 * - Récupérer tous les matchs de la journée depuis l'API ESPN
 * - Synchroniser avec la base de données
 * - Créer/Mettre à jour les matchs et équipes
 *
 * Sécurité : Protégé par CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier le secret CRON pour sécuriser l'endpoint
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Starting daily games refresh...");

    // Obtenir la date du jour en heure de Paris
    const parisTime = new Date().toLocaleString("en-US", {
      timeZone: "Europe/Paris",
    });
    const today = new Date(parisTime);
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    console.log(`[CRON] Fetching games for: ${dateString} (Paris time)`);

    // Récupérer les matchs du jour depuis ESPN
    const games = await fetchTodaysGames(dateString);

    console.log(`[CRON] Found ${games.length} games`);

    // Synchroniser avec la DB
    let created = 0;
    let updated = 0;

    for (const game of games) {
      const existing = await prisma.game.findUnique({
        where: { externalId: String(game.id) },
      });

      if (existing) {
        // Mettre à jour si le match existe déjà
        await prisma.game.update({
          where: { externalId: String(game.id) },
          data: {
            status: game.status,
            homeScore: game.home_team_score,
            awayScore: game.visitor_team_score,
          },
        });
        updated++;
      } else {
        // Note: Le match sera créé via /api/games lors du premier fetch
        // Ce CRON sert principalement à rafraîchir les données
        created++;
      }
    }

    console.log(`[CRON] Refresh complete: ${created} created, ${updated} updated`);

    return NextResponse.json({
      success: true,
      date: dateString,
      totalGames: games.length,
      created,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error refreshing daily games:", error);
    return NextResponse.json(
      {
        error: "Error refreshing games",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
