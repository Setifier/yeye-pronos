import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTopScorerOdds } from "@/types/bonus";
import { getReferencePpgMap } from "@/lib/player-odds";

/**
 * GET /api/games/[gameId]/players
 *
 * Récupère tous les joueurs des deux équipes d'un match avec leur cote
 * pour le pronostic du meilleur scoreur.
 *
 * Retourne les joueurs triés par moyenne de points (meilleurs scoreurs en premier)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId est requis" },
        { status: 400 }
      );
    }

    // Récupérer le match avec les équipes
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

    // Saison du match (et non la date du jour : un match d'archive garde sa saison)
    const currentSeason = game.season;

    // Récupérer tous les joueurs des deux équipes
    const players = await prisma.player.findMany({
      where: {
        teamId: {
          in: [game.homeTeamId, game.awayTeamId],
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
      orderBy: {
        fullName: "asc",
      },
    });

    // Moyenne de référence (saison en cours, complétée par la saison précédente
    // tant que le joueur a moins de 10 matchs) — même calcul que l'attribution des points
    const ppgMap = await getReferencePpgMap(prisma, players.map((p) => p.id), currentSeason);

    // Formater les joueurs avec leur cote
    const playersWithOdds = players.map((player) => {
      const ref = ppgMap.get(player.id);
      const pointsPerGame = ref?.ppg ?? 0;
      const odds = calculateTopScorerOdds(pointsPerGame);

      return {
        id: player.id,
        fullName: player.fullName,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        jerseyNumber: player.jerseyNumber,
        headshot: player.headshot,
        isInjured: player.isInjured,
        injuryStatus: player.injuryStatus,
        team: player.team,
        // Stats
        pointsPerGame: Math.round(pointsPerGame * 10) / 10, // Arrondi à 1 décimale
        gamesPlayed: ref?.currentGames ?? 0,
        // "previous" / "blended" = moyenne complétée par la saison précédente (début de saison)
        ppgSource: ref?.source ?? "none",
        // Cote pour le prono
        odds,
      };
    });

    // Trier par moyenne de points (meilleurs scoreurs en premier)
    playersWithOdds.sort((a, b) => b.pointsPerGame - a.pointsPerGame);

    // Séparer par équipe
    const homeTeamPlayers = playersWithOdds.filter(
      (p) => p.team?.id === game.homeTeamId
    );
    const awayTeamPlayers = playersWithOdds.filter(
      (p) => p.team?.id === game.awayTeamId
    );

    return NextResponse.json({
      success: true,
      // Structure compatible avec game-card.tsx
      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        abbreviation: game.homeTeam.abbreviation,
        players: homeTeamPlayers,
      },
      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        abbreviation: game.awayTeam.abbreviation,
        players: awayTeamPlayers,
      },
      // Structure pour prediction-modal.tsx
      players: {
        home: homeTeamPlayers,
        away: awayTeamPlayers,
        all: playersWithOdds,
      },
      game: {
        id: game.id,
      },
      season: currentSeason,
    });
  } catch (error) {
    console.error("[API] Erreur lors de la récupération des joueurs:", error);

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
