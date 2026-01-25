import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Vérification des logos d'équipes...\n");

  const teams = await prisma.team.findMany({
    select: {
      id: true,
      abbreviation: true,
      name: true,
      city: true,
      logoUrl: true,
    },
    orderBy: { abbreviation: "asc" },
  });

  console.log(`📊 ${teams.length} équipes trouvées:\n`);

  teams.forEach((team) => {
    console.log(`${team.abbreviation.padEnd(4)} | ${team.city.padEnd(15)} ${team.name.padEnd(15)} | ${team.logoUrl || "❌ Pas de logo"}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
