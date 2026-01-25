import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Usage: npx tsx prisma/reset-user-image.ts <email>');
    console.error('   Exemple: npx tsx prisma/reset-user-image.ts slim@gmail.com');
    process.exit(1);
  }

  console.log(`🔍 Recherche de l'utilisateur: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) {
    console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);

  if (!user.image) {
    console.log('ℹ️  Cet utilisateur n\'a pas d\'image de profil.');
    process.exit(0);
  }

  // Afficher la taille de l'image actuelle
  const imageSizeKB = (user.image.length / 1024).toFixed(2);
  console.log(`📊 Taille actuelle de l'image: ${imageSizeKB} KB`);

  // Supprimer l'image
  await prisma.user.update({
    where: { email },
    data: { image: null },
  });

  console.log('✅ Image supprimée avec succès !');
  console.log('');
  console.log('📝 Vous pouvez maintenant:');
  console.log('   1. Supprimer tous les cookies de votre navigateur');
  console.log('   2. Vous reconnecter à l\'application');
  console.log('   3. Uploader une nouvelle image (qui sera automatiquement optimisée)');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
