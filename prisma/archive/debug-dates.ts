/**
 * Script de debug pour vérifier les dates en DB
 */

import { prisma } from "../src/lib/prisma";

async function debugDates() {
  console.log("🔍 Debug des dates en DB\n");

  // Prendre 5 matchs au hasard
  const games = await prisma.game.findMany({
    take: 5,
    include: {
      homeTeam: {
        select: { abbreviation: true },
      },
      awayTeam: {
        select: { abbreviation: true },
      },
    },
    orderBy: {
      gameDate: "asc",
    },
  });

  console.log(`📊 ${games.length} matchs trouvés\n`);

  for (const game of games) {
    console.log(`${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
    console.log(`  gameDate (UTC):     ${game.gameDate.toISOString()}`);
    console.log(`  localGameDate:      ${game.localGameDate.toISOString()}`);

    // Extraire juste la date (sans heure)
    const gameDateDay = game.gameDate.toISOString().split("T")[0];
    const localGameDateDay = game.localGameDate.toISOString().split("T")[0];

    console.log(`  gameDate jour:      ${gameDateDay}`);
    console.log(`  localGameDate jour: ${localGameDateDay}`);

    if (gameDateDay === localGameDateDay) {
      console.log(`  ⚠️  MÊME JOUR ! (pas normal si match après 19h ET)`);
    } else {
      console.log(`  ✅ Jours différents (normal)`);
    }
    console.log("");
  }

  // Tester une recherche pour une date spécifique
  const testDate = "2025-12-22";
  console.log(`\n🔍 Test de recherche pour ${testDate}...\n`);

  const [year, month, day] = testDate.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  console.log(`Recherche entre:`);
  console.log(`  Start: ${startDate.toISOString()}`);
  console.log(`  End:   ${endDate.toISOString()}\n`);

  const results = await prisma.game.findMany({
    where: {
      localGameDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  });

  console.log(`📊 ${results.length} matchs trouvés pour ${testDate}\n`);

  for (const game of results) {
    console.log(
      `  ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} - ${game.localGameDate.toISOString()}`
    );
  }
}

debugDates()
  .then(() => {
    console.log("\n✅ Debug terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
