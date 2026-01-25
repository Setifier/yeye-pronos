import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Suppression de toutes les notifications...");

  const result = await prisma.notification.deleteMany({});

  console.log(`✅ ${result.count} notifications supprimées !`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
