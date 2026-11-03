/**
 * Script pour vérifier les équipes en DB
 */

import { prisma } from "../src/lib/prisma";

async function checkTeams() {
  console.log("🏀 Vérification des équipes en DB...\n");

  const teams = await prisma.team.findMany({
    select: {
      id: true,
      externalId: true,
      abbreviation: true,
      name: true,
      city: true,
      conference: true,
    },
    orderBy: {
      abbreviation: "asc",
    },
  });

  console.log(`📊 Total : ${teams.length} équipes\n`);

  // Les 30 équipes NBA officielles 2025-26
  const OFFICIAL_30_TEAMS = [
    "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
    "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
    "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
  ];

  console.log("✅ Équipes officielles NBA 2025-26:");
  const officialTeams = teams.filter((t) =>
    OFFICIAL_30_TEAMS.includes(t.abbreviation)
  );
  for (const team of officialTeams) {
    console.log(
      `  ${team.abbreviation.padEnd(4)} - ${team.city} ${team.name}`
    );
  }

  console.log(`\n⚠️  Équipes NON officielles (à supprimer) :`);
  const extraTeams = teams.filter(
    (t) => !OFFICIAL_30_TEAMS.includes(t.abbreviation)
  );

  if (extraTeams.length === 0) {
    console.log("  Aucune ! 👍");
  } else {
    for (const team of extraTeams) {
      console.log(
        `  ${team.abbreviation.padEnd(4)} - ${team.city} ${team.name} (ID: ${team.externalId})`
      );
    }
  }

  console.log(
    `\n📊 Résumé : ${officialTeams.length} officielles / ${extraTeams.length} à supprimer`
  );

  if (extraTeams.length > 0) {
    console.log("\n💡 Pour supprimer les équipes non officielles :");
    console.log("   npm run db:clean-teams");
  }
}

checkTeams()
  .then(() => {
    console.log("\n✅ Vérification terminée");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
