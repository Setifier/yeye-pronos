import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

/**
 * Script de migration : Générer des friendCodes pour les utilisateurs existants
 *
 * Ce script génère un friendCode unique pour tous les utilisateurs
 * qui n'en ont pas encore (anciens utilisateurs avant la mise à jour)
 */

function generateFriendCode(): string {
  const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const CODE_LENGTH = 5;

  let code = "#";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }

  return code;
}

async function main() {
  console.log("🔄 Génération des friendCodes pour les utilisateurs existants...");

  // Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      friendCode: true,
    },
  });

  console.log(`📊 ${users.length} utilisateurs trouvés`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    // Si l'utilisateur a déjà un friendCode, on skip
    if (user.friendCode) {
      skipped++;
      continue;
    }

    // Générer un friendCode unique
    let friendCode: string;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
      friendCode = generateFriendCode();

      // Vérifier l'unicité
      const existing = await prisma.user.findUnique({
        where: { friendCode },
        select: { id: true },
      });

      if (!existing) {
        isUnique = true;

        // Mettre à jour l'utilisateur
        await prisma.user.update({
          where: { id: user.id },
          data: { friendCode },
        });

        console.log(`✅ ${user.name}: ${friendCode}`);
        updated++;
      } else {
        attempts++;
        console.log(`⚠️  Collision pour ${friendCode}, tentative ${attempts}/${MAX_ATTEMPTS}`);
      }
    }

    if (!isUnique) {
      console.error(`❌ Impossible de générer un friendCode unique pour ${user.name} après ${MAX_ATTEMPTS} tentatives`);
    }
  }

  console.log("\n📊 Résumé:");
  console.log(`   ✅ ${updated} utilisateurs mis à jour`);
  console.log(`   ⏭️  ${skipped} utilisateurs ignorés (déjà un friendCode)`);
  console.log("\n✨ Migration terminée!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erreur:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
