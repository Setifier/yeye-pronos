/**
 * Script pour vérifier les matchs de décembre en DB
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Vérification des matchs en DB pour décembre 2024...\n");

  const games = await prisma.game.findMany({
    where: {
      gameDate: {
        gte: new Date("2024-12-23T00:00:00Z"),
        lte: new Date("2024-12-27T23:59:59Z"),
      },
    },
    include: {
      homeTeam: {
        select: {
          abbreviation: true,
        },
      },
      awayTeam: {
        select: {
          abbreviation: true,
        },
      },
      predictions: true,
    },
    orderBy: {
      gameDate: "asc",
    },
  });

  console.log(`📊 Nombre de matchs trouvés: ${games.length}\n`);

  if (games.length === 0) {
    console.log("❌ Aucun match trouvé en DB pour cette période !");
    console.log("Les matchs doivent d'abord être créés.\n");
    return;
  }

  for (const game of games) {
    const date = game.gameDate.toLocaleDateString("fr-FR");
    const time = game.gameDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const pronos = game.predictions.length;

    console.log(`📅 ${date} ${time} - ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
    console.log(`   Status: ${game.status} | Score: ${game.awayScore ?? "-"} - ${game.homeScore ?? "-"}`);
    console.log(`   ExternalId: ${game.externalId} | Pronos: ${pronos}`);
    console.log("");
  }

  // Stats des pronos
  const totalPredictions = await prisma.prediction.count();
  const wonPredictions = await prisma.prediction.count({
    where: { result: "WON" },
  });
  const lostPredictions = await prisma.prediction.count({
    where: { result: "LOST" },
  });
  const pendingPredictions = await prisma.prediction.count({
    where: { result: "PENDING" },
  });

  console.log("📈 Statistiques globales des pronos:");
  console.log(`   Total: ${totalPredictions}`);
  console.log(`   ✅ Gagnés: ${wonPredictions}`);
  console.log(`   ❌ Perdus: ${lostPredictions}`);
  console.log(`   ⏳ En attente: ${pendingPredictions}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
