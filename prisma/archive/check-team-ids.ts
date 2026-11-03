import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function checkTeamIds() {
  console.log("🔍 Vérification des ESPN IDs...\n");

  const teams = await prisma.team.findMany({
    where: {
      abbreviation: { in: ["CHI", "CHA", "WAS"] },
    },
    select: {
      id: true,
      abbreviation: true,
      name: true,
      city: true,
      externalId: true,
    },
  });

  console.log("📊 Équipes en DB:");
  for (const team of teams) {
    console.log(`   ${team.abbreviation} - ${team.city} ${team.name}`);
    console.log(`      DB ID: ${team.id}`);
    console.log(`      ESPN ID: ${team.externalId}\n`);
  }

  // Vérifier le match
  const game = await prisma.game.findUnique({
    where: { id: "fc4dc070-9f0a-44ef-a1af-c42b0f3414c6" },
    include: {
      homeTeam: { select: { abbreviation: true, externalId: true } },
      awayTeam: { select: { abbreviation: true, externalId: true } },
    },
  });

  if (game) {
    console.log("🏀 Match en DB:");
    console.log(`   Away: ${game.awayTeam.abbreviation} (ESPN ID: ${game.awayTeam.externalId})`);
    console.log(`   Home: ${game.homeTeam.abbreviation} (ESPN ID: ${game.homeTeam.externalId})`);
  }

  await prisma.$disconnect();
}

checkTeamIds();
