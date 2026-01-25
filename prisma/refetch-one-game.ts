import { PrismaClient } from "../src/generated/prisma";
import { fetchAndSaveGameStats } from "../src/lib/espn-stats";
import { getScoreMarginCategory } from "../src/types/bonus";

const prisma = new PrismaClient();

async function refetchGame() {
  const gameId = "fc4dc070-9f0a-44ef-a1af-c42b0f3414c6";

  console.log("🔄 Re-fetch du match CHA @ CHI...\n");

  // Récupérer le match
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (!game) {
    console.log("❌ Match introuvable");
    return;
  }

  console.log(`📊 Match: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
  console.log(`   ESPN ID: ${game.externalId}\n`);

  try {
    // Récupérer et sauvegarder les stats
    const topScorer = await fetchAndSaveGameStats(game.externalId, game.id);

    if (topScorer) {
      // Calculer le score margin
      if (game.homeScore !== null && game.awayScore !== null) {
        const actualMargin = Math.abs(game.homeScore - game.awayScore);
        const hasOvertime = (game.currentPeriod ?? 0) > 4;
        const scoreMarginCategory = getScoreMarginCategory(
          game.homeScore,
          game.awayScore,
          hasOvertime
        );

        // Mettre à jour le Game avec les infos bonus
        await prisma.game.update({
          where: { id: game.id },
          data: {
            topScorerId: topScorer.playerId,
            topScorerPoints: topScorer.points,
            actualScoreMargin: actualMargin,
            scoreMarginCategory,
            hasOvertime,
          },
        });
      }

      console.log(`\n✅ Top scorer: ${topScorer.playerName} (${topScorer.points} pts)`);
    }

    // Vérifier les stats sauvegardées
    const stats = await prisma.gamePlayerStats.findMany({
      where: { gameId },
      include: {
        team: { select: { abbreviation: true } },
      },
    });

    const grouped = stats.reduce((acc, stat) => {
      if (!acc[stat.teamId]) {
        acc[stat.teamId] = { team: stat.team.abbreviation, count: 0 };
      }
      acc[stat.teamId].count++;
      return acc;
    }, {} as Record<string, { team: string; count: number }>);

    console.log("\n📊 Stats sauvegardées:");
    for (const [teamId, data] of Object.entries(grouped)) {
      const isHome = teamId === game.homeTeamId;
      const isAway = teamId === game.awayTeamId;
      console.log(`   ${data.team} (${isHome ? "HOME" : isAway ? "AWAY" : "???"}) : ${data.count} joueurs`);
    }

    console.log("\n✅ Re-fetch terminé avec succès !");
  } catch (error) {
    console.error("\n❌ Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

refetchGame();
