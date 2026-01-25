/**
 * Script pour corriger les abbreviations des équipes vers les standards NBA officiels
 *
 * Ces abbreviations sont utilisées partout : ESPN, NBA.com, stats sites, etc.
 *
 * Usage: npx tsx prisma/fix-team-abbreviations.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

// Mapping des abbreviations non-standard vers les standards officiels
const ABBREVIATION_FIXES: { [old: string]: string } = {
  "NO": "NOP",   // New Orleans Pelicans
  "GS": "GSW",   // Golden State Warriors
  "NY": "NYK",   // New York Knicks
  "SA": "SAS",   // San Antonio Spurs
  "UTAH": "UTA", // Utah Jazz
  "WSH": "WAS",  // Washington Wizards
};

async function main() {
  console.log("🔧 Correction des abbreviations vers les standards NBA officiels\n");

  const teams = await prisma.team.findMany();
  console.log(`✅ ${teams.length} équipes trouvées en DB\n`);

  let totalUpdated = 0;

  for (const [oldAbbr, newAbbr] of Object.entries(ABBREVIATION_FIXES)) {
    const team = teams.find((t) => t.abbreviation === oldAbbr);

    if (team) {
      await prisma.team.update({
        where: { id: team.id },
        data: { abbreviation: newAbbr },
      });

      console.log(`✅ ${team.name.padEnd(25)} : ${oldAbbr.padEnd(5)} → ${newAbbr}`);
      totalUpdated++;
    } else {
      console.log(`⚠️  Équipe non trouvée avec abbreviation : ${oldAbbr}`);
    }
  }

  console.log(`\n📊 Total équipes mises à jour : ${totalUpdated}\n`);

  // Afficher toutes les abbreviations finales
  const updatedTeams = await prisma.team.findMany({
    orderBy: { abbreviation: "asc" },
  });

  console.log("📋 Abbreviations finales (triées) :\n");
  for (const team of updatedTeams) {
    console.log(`   ${team.abbreviation.padEnd(4)} - ${team.name}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
