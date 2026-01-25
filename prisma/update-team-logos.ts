import { PrismaClient } from "../src/generated/prisma";
import { NBA_TEAM_LOGOS } from "../src/lib/nba-logos";

const prisma = new PrismaClient();

/**
 * Script pour mettre à jour les URLs des logos d'équipes NBA
 * Pointe vers les fichiers locaux dans public/assets/teams_logo/
 */
async function main() {
  console.log("🏀 Mise à jour des logos des équipes NBA...\n");

  let updated = 0;
  let notFound = 0;

  for (const [abbreviation, filename] of Object.entries(NBA_TEAM_LOGOS)) {
    try {
      // Chercher l'équipe par abréviation
      const team = await prisma.team.findUnique({
        where: { abbreviation },
      });

      if (!team) {
        console.log(`❌ Équipe non trouvée: ${abbreviation}`);
        notFound++;
        continue;
      }

      // Construire l'URL du logo local
      const logoUrl = `/assets/teams_logo/${filename}`;

      // Mettre à jour l'équipe
      await prisma.team.update({
        where: { abbreviation },
        data: { logoUrl },
      });

      console.log(`✅ ${abbreviation.padEnd(4)} → ${logoUrl}`);
      updated++;
    } catch (error) {
      console.error(`❌ Erreur pour ${abbreviation}:`, error);
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Logos mis à jour: ${updated}`);
  console.log(`   ❌ Équipes non trouvées: ${notFound}`);
  console.log(`   📦 Total: ${Object.keys(NBA_TEAM_LOGOS).length}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
