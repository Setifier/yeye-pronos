"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bdl } from "@/lib/balldontlie";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { GameStatus } from "@/generated/prisma";

/**
 * Vérifier que l'utilisateur est admin
 */
async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }

  return session.user;
}

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
 * Rafraîchir manuellement les scores d'un match
 */
export async function refreshGameScoresAction({ gameId }: { gameId: string }) {
  try {
    await requireAdmin();

    // Récupérer le match en DB
    const dbGame = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!dbGame) {
      return { success: false, error: "Match introuvable" };
    }

    // Récupérer les infos depuis l'API
    const apiGame = await bdl.nba.getGame(parseInt(dbGame.externalId));

    if (!apiGame.data) {
      return { success: false, error: "Match introuvable dans l'API" };
    }

    // Mapper le nouveau status et scores
    const newStatus = mapGameStatus(apiGame.data.status);
    const newHomeScore = apiGame.data.home_team_score;
    const newAwayScore = apiGame.data.visitor_team_score;

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
      where: { id: gameId },
      data: {
        status: newStatus,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        winnerId,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/admin/games");
    return {
      success: true,
      game: {
        status: newStatus,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
      },
    };
  } catch (error) {
    console.error("[refreshGameScoresAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
