import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    select: {
      id: true,
      type: true,
      title: true,
      createdAt: true,
      userId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  console.log(`📬 Total notifications en DB: ${notifications.length}\n`);

  notifications.forEach((notif) => {
    console.log(`- [${notif.type}] ${notif.title} (${notif.createdAt.toISOString()})`);
  });

  console.log(`\n🗑️  Pour supprimer toutes les notifications:`);
  console.log(`npx tsx prisma/delete-all-notifications.ts`);
}

main()
  .finally(() => prisma.$disconnect());
