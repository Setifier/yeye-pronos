import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  // Sample de quelques matchs
  const games = await prisma.game.findMany({
    where: { season: "2025-2026" },
    take: 5,
    orderBy: { gameDate: "asc" },
    include: {
      homeTeam: { select: { name: true, abbreviation: true } },
      awayTeam: { select: { name: true, abbreviation: true } },
    },
  });

  console.log("\n=== ÉCHANTILLON DE MATCHS EN DB ===\n");

  for (const game of games) {
    console.log(`Match: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
    console.log(`  External ID: ${game.externalId}`);
    console.log(`  Date: ${game.gameDate.toLocaleDateString("fr-FR")}`);
    console.log(`  Status: ${game.status}`);
    console.log(`  Score: ${game.awayScore} - ${game.homeScore}`);
    console.log();
  }

  await prisma.$disconnect();
}

main();
