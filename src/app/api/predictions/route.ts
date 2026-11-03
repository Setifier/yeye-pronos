import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GameStatus } from "@/generated/prisma";
import { predictionDeadlineFor } from "@/types/bet";

// Catégories d'écart de score valides
const VALID_SCORE_MARGINS = [
  "OVERTIME",   // Prolongation
  "SERRE",      // 1-5 pts
  "CLASSIQUE",  // 6-10 pts
  "FACILE",     // 11-15 pts
  "LARGE",      // 16-20 pts
  "BLOWOUT",    // +21 pts
] as const;

/**
 * POST /api/predictions
 * Créer ou mettre à jour un pronostic pour un match
 *
 * Body: {
 *   gameId: string,
 *   predictedTeamId: string,
 *   predictedScoreMargin?: string,    // OVERTIME, SERRE, CLASSIQUE, FACILE, LARGE, BLOWOUT
 *   predictedTopScorerId?: string     // UUID du joueur
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour faire un pronostic" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting : max 30 modifications par minute par utilisateur
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentCount = await prisma.prediction.count({
      where: { userId, updatedAt: { gte: oneMinuteAgo } },
    });
    if (recentCount >= 30) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter avant de réessayer." },
        { status: 429 }
      );
    }

    // Parser le body
    const body = await request.json();
    const { gameId, predictedTeamId, predictedScoreMargin, predictedTopScorerId } = body;

    if (!gameId || !predictedTeamId) {
      return NextResponse.json(
        { error: "gameId et predictedTeamId sont requis" },
        { status: 400 }
      );
    }

    // Valider predictedScoreMargin si fourni
    if (predictedScoreMargin && !VALID_SCORE_MARGINS.includes(predictedScoreMargin)) {
      return NextResponse.json(
        { error: "Catégorie d'écart invalide" },
        { status: 400 }
      );
    }

    // Récupérer le match
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Match introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que predictedTeamId est bien une des deux équipes du match
    if (
      predictedTeamId !== game.homeTeamId &&
      predictedTeamId !== game.awayTeamId
    ) {
      return NextResponse.json(
        { error: "L'équipe prédite doit être une des deux équipes du match" },
        { status: 400 }
      );
    }

    // Vérifier que le match n'est pas déjà commencé ou terminé
    if (game.status !== GameStatus.SCHEDULED) {
      return NextResponse.json(
        { error: "Ce match a déjà commencé ou est terminé" },
        { status: 400 }
      );
    }

    // Match de playoffs "if necessary" : pas de pari tant qu'il n'est pas confirmé
    if (game.isIfNecessary) {
      return NextResponse.json(
        { error: "Ce match n'est pas encore confirmé (if necessary)" },
        { status: 400 }
      );
    }

    // Vérifier que la deadline n'est pas passée (règle centrale : src/types/bet.ts)
    const now = new Date();
    const deadline = predictionDeadlineFor(game.gameDate); // clôture au coup d'envoi

    if (deadline <= now) {
      return NextResponse.json(
        { error: "La deadline pour pronostiquer ce match est passée" },
        { status: 400 }
      );
    }

    // Si predictedTopScorerId fourni, vérifier que le joueur existe et appartient à une des équipes
    if (predictedTopScorerId) {
      const player = await prisma.player.findUnique({
        where: { id: predictedTopScorerId },
        select: { teamId: true },
      });

      if (!player) {
        return NextResponse.json(
          { error: "Joueur introuvable" },
          { status: 404 }
        );
      }

      if (player.teamId !== game.homeTeamId && player.teamId !== game.awayTeamId) {
        return NextResponse.json(
          { error: "Le joueur doit appartenir à une des deux équipes du match" },
          { status: 400 }
        );
      }
    }

    // Créer ou mettre à jour le pronostic (upsert)
    // Bonus : clé absente du body = on garde la valeur existante ; `null` = on retire le bonus.
    // (Avant, changer d'équipe en un clic effaçait l'écart et le top scorer déjà choisis.)
    const hasMargin    = Object.prototype.hasOwnProperty.call(body, "predictedScoreMargin");
    const hasTopScorer = Object.prototype.hasOwnProperty.call(body, "predictedTopScorerId");

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
      create: {
        userId,
        gameId,
        predictedTeamId,
        predictedScoreMargin: predictedScoreMargin || null,
        predictedTopScorerId: predictedTopScorerId || null,
      },
      update: {
        predictedTeamId,
        ...(hasMargin ? { predictedScoreMargin: predictedScoreMargin || null } : {}),
        ...(hasTopScorer ? { predictedTopScorerId: predictedTopScorerId || null } : {}),
        updatedAt: new Date(),
      },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
        predictedTopScorer: {
          select: {
            id: true,
            fullName: true,
            headshot: true,
            teamId: true,
          },
        },
      },
    });

    // Déterminer le nom de l'équipe prédite
    const predictedTeam =
      predictedTeamId === game.homeTeamId ? game.homeTeam : game.awayTeam;

    return NextResponse.json({
      success: true,
      message: `Pronostic enregistré : ${predictedTeam.city} ${predictedTeam.name}`,
      prediction: {
        id: prediction.id,
        gameId: prediction.gameId,
        predictedTeamId: prediction.predictedTeamId,
        predictedTeamName: `${predictedTeam.city} ${predictedTeam.name}`,
        predictedTeamAbbreviation: predictedTeam.abbreviation,
        predictedScoreMargin: prediction.predictedScoreMargin,
        predictedTopScorerId: prediction.predictedTopScorerId,
        predictedTopScorer: prediction.predictedTopScorer,
        result: prediction.result,
        pointsEarned: prediction.pointsEarned,
        createdAt: prediction.createdAt,
        updatedAt: prediction.updatedAt,
      },
    });
  } catch (error) {
    console.error("[API] Erreur lors de la création du pronostic:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/predictions?gameId=xxx
 * Récupérer le pronostic de l'utilisateur pour un match spécifique
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer le gameId depuis les query params
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId est requis" },
        { status: 400 }
      );
    }

    // Récupérer le pronostic avec les bonus et les infos réelles du match
    const prediction = await prisma.prediction.findUnique({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true,
            topScorer: {
              select: {
                id: true,
                fullName: true,
                headshot: true,
              },
            },
          },
        },
        predictedTopScorer: {
          select: {
            id: true,
            fullName: true,
            headshot: true,
            teamId: true,
          },
        },
      },
    });

    if (!prediction) {
      return NextResponse.json({
        success: true,
        prediction: null,
      });
    }

    // Déterminer le nom de l'équipe prédite
    const predictedTeam =
      prediction.predictedTeamId === prediction.game.homeTeamId
        ? prediction.game.homeTeam
        : prediction.game.awayTeam;

    return NextResponse.json({
      success: true,
      prediction: {
        id: prediction.id,
        gameId: prediction.gameId,
        predictedTeamId: prediction.predictedTeamId,
        predictedTeamName: `${predictedTeam.city} ${predictedTeam.name}`,
        predictedTeamAbbreviation: predictedTeam.abbreviation,
        predictedScoreMargin: prediction.predictedScoreMargin,
        predictedTopScorerId: prediction.predictedTopScorerId,
        predictedTopScorer: prediction.predictedTopScorer,
        result: prediction.result,
        pointsEarned: prediction.pointsEarned,
        marginBonusPoints: prediction.marginBonusPoints,
        topScorerBonusPoints: prediction.topScorerBonusPoints,
        comboBonusPoints: prediction.comboBonusPoints,
        // Infos réelles du match (pour afficher les résultats)
        actualScoreMargin: prediction.game.scoreMarginCategory,
        actualTopScorer: prediction.game.topScorer,
        actualTopScorerPoints: prediction.game.topScorerPoints,
        createdAt: prediction.createdAt,
        updatedAt: prediction.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "[API] Erreur lors de la récupération du pronostic:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/predictions?gameId=xxx
 * Supprimer le pronostic de l'utilisateur pour un match (annulation)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Vous devez être connecté" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer le gameId depuis les query params
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId est requis" },
        { status: 400 }
      );
    }

    // Vérifier que le match existe et n'est pas commencé
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Match introuvable" },
        { status: 404 }
      );
    }

    if (game.status !== GameStatus.SCHEDULED) {
      return NextResponse.json(
        { error: "Ce match a déjà commencé ou est terminé" },
        { status: 400 }
      );
    }

    // Vérifier que la deadline n'est pas passée
    const now = new Date();
    const deadline = predictionDeadlineFor(game.gameDate); // clôture au coup d'envoi

    if (deadline <= now) {
      return NextResponse.json(
        { error: "La deadline pour modifier ce pronostic est passée" },
        { status: 400 }
      );
    }

    // Supprimer le pronostic
    const deleted = await prisma.prediction.deleteMany({
      where: {
        userId,
        gameId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Aucun pronostic à supprimer" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pronostic annulé",
    });
  } catch (error) {
    console.error("[API] Erreur lors de la suppression du pronostic:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
