import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bdl } from "@/lib/balldontlie";
import { GameStatus } from "@/generated/prisma";

/**
 * Mapper le status d'un match depuis l'API BallDontLie vers notre enum GameStatus
 */
function mapGameStatus(status: string): GameStatus {
  const normalized = status.toLowerCase();

  if (normalized.includes("final")) return GameStatus.FINAL;
  if (normalized.includes("progress") || normalized.includes("live")) {
    return GameStatus.LIVE;
  }
  if (normalized.includes("postponed")) return GameStatus.POSTPONED;
  if (normalized.includes("cancelled")) return GameStatus.CANCELLED;

  return GameStatus.SCHEDULED;
}

/**
 * Route CRON pour mettre à jour les scores des matchs du jour
 * Devrait être appelée toutes les 30 minutes entre 18h et 6h UTC
 *
 * Sécurisée avec un secret CRON_SECRET en header
 *
 * Usage:
 * POST /api/cron/update-scores
 * Headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'autorisation
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || token !== process.env.CRON_SECRET) {
      console.log("[CRON] ❌ Tentative d'accès non autorisée");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] 🚀 Démarrage de la mise à jour des scores...");

    // Obtenir la date d'aujourd'hui en Eastern Time
    const now = new Date();
    const todayET = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );

    // Formatter pour l'API (YYYY-MM-DD)
    const year = todayET.getFullYear();
    const month = String(todayET.getMonth() + 1).padStart(2, "0");
    const day = String(todayET.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    // Chercher les matchs de cette date (19h30 ET = 00h30 UTC du LENDEMAIN)
    // Match du "18 déc" → stocké "19 déc 00:30 UTC"
    const searchDate = new Date(Date.UTC(year, todayET.getMonth(), todayET.getDate() + 1, 0, 30, 0, 0));
    const dayBefore = new Date(searchDate.getTime() - 12 * 60 * 60 * 1000);
    const dayAfter = new Date(searchDate.getTime() + 12 * 60 * 60 * 1000);

    console.log(`[CRON] 📅 Recherche des matchs du ${dateString} (ET)`);

    // Récupérer les matchs d'aujourd'hui depuis notre DB
    const dbGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: dayBefore,
          lte: dayAfter,
        },
        // Ne mettre à jour que les matchs qui ne sont pas annulés
        status: {
          not: GameStatus.CANCELLED,
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    console.log(`[CRON] 📊 ${dbGames.length} matchs trouvés en DB`);

    if (dbGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun match à mettre à jour aujourd'hui",
        updated: 0,
      });
    }

    // Récupérer les matchs du jour depuis l'API BallDontLie
    console.log(
      `[CRON] 🌐 Récupération des matchs depuis BallDontLie (${dateString})...`
    );

    const response = await bdl.nba.getGames({
      dates: [dateString],
      per_page: 100,
    });

    const apiGames = response.data;
    console.log(`[CRON] 📊 ${apiGames.length} matchs reçus de l'API`);

    // Créer un Map pour un accès rapide
    const apiGamesMap = new Map(
      apiGames.map((game) => [String(game.id), game])
    );

    let updatedCount = 0;
    let unchangedCount = 0;

    // Comparer et mettre à jour
    for (const dbGame of dbGames) {
      const apiGame = apiGamesMap.get(dbGame.externalId);

      if (!apiGame) {
        console.log(
          `[CRON] ⚠️  Match ${dbGame.externalId} introuvable dans l'API`
        );
        continue;
      }

      // Vérifier si une mise à jour est nécessaire
      const newStatus = mapGameStatus(apiGame.status);
      const newHomeScore = apiGame.home_team_score;
      const newAwayScore = apiGame.visitor_team_score;

      const needsUpdate =
        newStatus !== dbGame.status ||
        newHomeScore !== dbGame.homeScore ||
        newAwayScore !== dbGame.awayScore;

      if (!needsUpdate) {
        unchangedCount++;
        continue;
      }

      // Calculer le winnerId si le match est terminé
      let winnerId: string | null = null;
      if (newStatus === GameStatus.FINAL) {
        if (newHomeScore !== null && newAwayScore !== null) {
          winnerId =
            newHomeScore > newAwayScore
              ? dbGame.homeTeamId
              : dbGame.awayTeamId;
        }
      }

      // Mettre à jour le match
      await prisma.game.update({
        where: { id: dbGame.id },
        data: {
          status: newStatus,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          winnerId,
          updatedAt: new Date(),
        },
      });

      updatedCount++;

      console.log(
        `[CRON] ✅ Match mis à jour: ${dbGame.awayTeam.abbreviation} @ ${dbGame.homeTeam.abbreviation} (${newAwayScore}-${newHomeScore}, ${newStatus})`
      );
    }

    console.log(`[CRON] ✨ Mise à jour terminée:`);
    console.log(`  - ${updatedCount} matchs mis à jour`);
    console.log(`  - ${unchangedCount} matchs inchangés`);

    return NextResponse.json({
      success: true,
      message: "Scores mis à jour avec succès",
      updated: updatedCount,
      unchanged: unchangedCount,
      total: dbGames.length,
    });
  } catch (error) {
    console.error("[CRON] ❌ Erreur lors de la mise à jour:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler pour tester la route (seulement en développement)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // En dev, permettre un GET sans auth pour tester
  // Créer une requête modifiée avec le header d'auth
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${process.env.CRON_SECRET}`);

  const modifiedRequest = new NextRequest(request.url, {
    method: "POST",
    headers,
  });

  return POST(modifiedRequest);
}
