import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

/**
 * Supprime les matchs doublons créés par erreur
 * Garde le match le plus ancien (créé en premier)
 */
async function deleteDuplicates() {
  console.log("🗑️  Recherche et suppression des doublons...\n");

  // Trouver tous les doublons (même équipes, même date)
  const duplicates = await prisma.game.groupBy({
    by: ["homeTeamId", "awayTeamId", "gameDate"],
    having: {
      homeTeamId: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: true,
  });

  console.log(`📊 ${duplicates.length} groupes de doublons trouvés\n`);

  if (duplicates.length === 0) {
    console.log("✅ Aucun doublon à supprimer");
    return;
  }

  let totalDeleted = 0;

  for (const dup of duplicates) {
    // Récupérer tous les matchs de ce groupe
    const games = await prisma.game.findMany({
      where: {
        homeTeamId: dup.homeTeamId,
        awayTeamId: dup.awayTeamId,
        gameDate: dup.gameDate,
      },
      include: {
        homeTeam: { select: { abbreviation: true } },
        awayTeam: { select: { abbreviation: true } },
        predictions: true,
        playerStats: true,
      },
      orderBy: {
        createdAt: "asc", // Le plus ancien en premier
      },
    });

    if (games.length < 2) continue;

    const keepGame = games[0]; // Garder le plus ancien
    const deleteGames = games.slice(1); // Supprimer les autres

    console.log(`\n🔍 ${keepGame.awayTeam.abbreviation} @ ${keepGame.homeTeam.abbreviation} (${keepGame.gameDate.toISOString().split("T")[0]})`);
    console.log(`  ✅ Garder: ${keepGame.externalId} (créé ${keepGame.createdAt.toISOString()}, ${keepGame.predictions.length} pronos, ${keepGame.playerStats.length} stats)`);

    for (const deleteGame of deleteGames) {
      console.log(`  ❌ Supprimer: ${deleteGame.externalId} (créé ${deleteGame.createdAt.toISOString()}, ${deleteGame.predictions.length} pronos, ${deleteGame.playerStats.length} stats)`);

      // Si le match à supprimer a des pronos ou stats et pas celui à garder, ARRÊTER
      if (deleteGame.predictions.length > 0 || deleteGame.playerStats.length > 0) {
        console.log(`    ⚠️  ATTENTION: Ce match a des données ! Vérification manuelle requise.`);
        continue;
      }

      // Supprimer le doublon
      await prisma.game.delete({
        where: { id: deleteGame.id },
      });

      totalDeleted++;
      console.log(`    ✅ Supprimé`);
    }
  }

  console.log(`\n✅ ${totalDeleted} doublons supprimés`);

  await prisma.$disconnect();
}

deleteDuplicates();
