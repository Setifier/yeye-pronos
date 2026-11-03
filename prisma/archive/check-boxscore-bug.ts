import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function checkBoxscoreBug() {
  const gameId = "fc4dc070-9f0a-44ef-a1af-c42b0f3414c6";

  console.log("🔍 Vérification du bug boxscore...\n");

  // Récupérer le match
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { select: { id: true, abbreviation: true } },
      awayTeam: { select: { id: true, abbreviation: true } },
    },
  });

  if (!game) {
    console.log("❌ Match introuvable");
    return;
  }

  console.log(`📊 Match: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
  console.log(`   Away Team ID: ${game.awayTeamId}`);
  console.log(`   Home Team ID: ${game.homeTeamId}\n`);

  // Compter les stats par équipe
  const stats = await prisma.gamePlayerStats.findMany({
    where: { gameId },
    include: {
      player: { select: { fullName: true } },
      team: { select: { abbreviation: true } },
    },
  });

  console.log(`📈 Total stats: ${stats.length}`);

  // Grouper par teamId
  const grouped = stats.reduce((acc, stat) => {
    if (!acc[stat.teamId]) {
      acc[stat.teamId] = [];
    }
    acc[stat.teamId].push(stat);
    return acc;
  }, {} as Record<string, typeof stats>);

  console.log("\n🔢 Répartition par équipe:");
  for (const [teamId, teamStats] of Object.entries(grouped)) {
    const isHome = teamId === game.homeTeamId;
    const isAway = teamId === game.awayTeamId;
    const teamAbbr = teamStats[0].team.abbreviation;

    console.log(
      `   ${teamAbbr} (${isHome ? "HOME" : isAway ? "AWAY" : "???"}) : ${teamStats.length} joueurs`
    );
    console.log(`      teamId en DB: ${teamId}`);
    if (teamStats.length > 0) {
      console.log(`      Exemples: ${teamStats.slice(0, 3).map(s => s.player.fullName).join(", ")}`);
    }
  }

  // Le problème
  const awayCount = grouped[game.awayTeamId]?.length || 0;
  const homeCount = grouped[game.homeTeamId]?.length || 0;

  console.log("\n❗ DIAGNOSTIC:");
  if (awayCount === 0 && homeCount === 0) {
    console.log("   ⚠️  Aucun joueur trouvé pour ce match!");
  } else if (awayCount === 0 || homeCount === 0) {
    console.log(
      `   ❌ BUG CONFIRMÉ: Tous les joueurs sont dans ${awayCount > 0 ? "AWAY" : "HOME"}`
    );
    console.log("   ✅ Solution: Re-fetch avec le fix");
  } else {
    console.log("   ✅ Tout est OK: Les joueurs sont bien répartis");
  }

  await prisma.$disconnect();
}

checkBoxscoreBug();
