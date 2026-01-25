/**
 * Script pour mettre à jour les couleurs des équipes NBA dans la base de données
 *
 * Usage: npx tsx prisma/update-team-colors.ts
 */

import { PrismaClient } from "../src/generated/prisma";
import { NBA_TEAM_COLORS } from "../src/lib/nba-team-colors";

const prisma = new PrismaClient();

async function main() {
  console.log("🎨 Mise à jour des couleurs des équipes NBA...\n");

  let updated = 0;
  let notFound = 0;

  for (const [abbreviation, colors] of Object.entries(NBA_TEAM_COLORS)) {
    try {
      const team = await prisma.team.findUnique({
        where: { abbreviation },
      });

      if (!team) {
        console.log(`❌ Équipe non trouvée: ${abbreviation}`);
        notFound++;
        continue;
      }

      await prisma.team.update({
        where: { abbreviation },
        data: {
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
        },
      });

      console.log(`✅ ${abbreviation}: ${colors.primary} / ${colors.secondary}`);
      updated++;
    } catch (error) {
      console.error(`❌ Erreur pour ${abbreviation}:`, error);
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Équipes mises à jour: ${updated}`);
  console.log(`   ❌ Équipes non trouvées: ${notFound}`);
  console.log(`   📦 Total: ${Object.keys(NBA_TEAM_COLORS).length}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
