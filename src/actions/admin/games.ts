"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
 * Mapper le status ESPN vers notre enum GameStatus
 */
function mapEspnStatus(statusType: string, statusState: string): GameStatus {
  if (statusType === "STATUS_FINAL") return GameStatus.FINAL;
  if (statusType === "STATUS_IN_PROGRESS") return GameStatus.LIVE;
  if (statusType === "STATUS_POSTPONED" || statusState === "post" && statusType.includes("POSTPONED")) return GameStatus.POSTPONED;
  if (statusType === "STATUS_CANCELED" || statusType === "STATUS_CANCELLED") return GameStatus.CANCELLED;
  return GameStatus.SCHEDULED;
}

/**
 * Rafraîchir manuellement les scores d'un match via ESPN API
 */
export async function refreshGameScoresAction({ gameId }: { gameId: string }) {
  try {
    await requireAdmin();

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

    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${dbGame.externalId}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return { success: false, error: `ESPN API error: ${res.status}` };
    }

    const data = await res.json();
    const competition = data?.header?.competitions?.[0];

    if (!competition) {
      return { success: false, error: "Match introuvable dans l'API ESPN" };
    }

    const statusType = competition.status?.type?.name ?? "";
    const statusState = competition.status?.type?.state ?? "";
    const newStatus = mapEspnStatus(statusType, statusState);

    const homeCompetitor = competition.competitors?.find(
      (c: { homeAway: string }) => c.homeAway === "home"
    );
    const awayCompetitor = competition.competitors?.find(
      (c: { homeAway: string }) => c.homeAway === "away"
    );

    const newHomeScore = homeCompetitor?.score ? parseInt(homeCompetitor.score) : null;
    const newAwayScore = awayCompetitor?.score ? parseInt(awayCompetitor.score) : null;

    let winnerId: string | null = null;
    if (newStatus === GameStatus.FINAL && newHomeScore !== null && newAwayScore !== null) {
      winnerId = newHomeScore > newAwayScore ? dbGame.homeTeamId : dbGame.awayTeamId;
    }

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
