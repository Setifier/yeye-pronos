import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const ESPN_SCOREBOARD_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

async function main() {
  console.log("\n" + "═".repeat(80));
  console.log("🔍 DIAGNOSTIC - MISMATCH ENTRE DB ET ESPN API");
  console.log("═".repeat(80));

  // 1. Échantillon de matchs en DB
  console.log("\n📊 ÉCHANTILLON DE MATCHS EN DB :\n");

  const dbGames = await prisma.game.findMany({
    where: {
      season: "2025-26",
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    take: 10,
    orderBy: { gameDate: "asc" },
    include: {
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  });

  for (const game of dbGames) {
    const dateUTC = game.gameDate.toISOString();
    const dateFR = game.gameDate.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const dateUS = game.gameDate.toLocaleString("en-US", { timeZone: "America/New_York" });

    console.log(`${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
    console.log(`  External ID: ${game.externalId}`);
    console.log(`  Date UTC: ${dateUTC}`);
    console.log(`  Date FR:  ${dateFR}`);
    console.log(`  Date US:  ${dateUS}`);
    console.log(`  Status: ${game.status}`);
    console.log();
  }

  // 2. Test avec une date spécifique
  if (dbGames.length > 0) {
    const firstGame = dbGames[0];
    const dateKey = firstGame.gameDate.toISOString().split("T")[0];

    console.log("═".repeat(80));
    console.log(`\n🌐 CE QUE L'API ESPN RETOURNE POUR ${dateKey} :\n`);

    try {
      const url = `${ESPN_SCOREBOARD_API}?dates=${dateKey.replace(/-/g, "")}`;
      const response = await fetch(url);
      const data = await response.json();

      const espnGames = data.events || [];
      console.log(`✅ ${espnGames.length} matchs reçus de l'API ESPN\n`);

      for (const espnGame of espnGames.slice(0, 10)) {
        const competition = espnGame.competitions[0];
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === "home");
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === "away");

        console.log(`${awayTeam?.team?.abbreviation || "?"} @ ${homeTeam?.team?.abbreviation || "?"}`);
        console.log(`  ESPN ID: ${espnGame.id}`);
        console.log(`  ESPN Date: ${espnGame.date}`);
        console.log(`  ESPN Status: ${espnGame.status?.type?.name || "?"}`);
        console.log();
      }

      // 3. Vérifier si les IDs matchent
      console.log("═".repeat(80));
      console.log("\n🔎 COMPARAISON IDS :\n");

      const dbIds = dbGames.map((g) => g.externalId);
      const espnIds = espnGames.map((g: any) => g.id);

      console.log("IDs en DB:", dbIds.slice(0, 5));
      console.log("IDs ESPN:", espnIds.slice(0, 5));

      const matches = dbIds.filter((id) => espnIds.includes(id));
      console.log(`\n✅ ${matches.length} IDs qui matchent sur ${dbIds.length} testés`);

      if (matches.length === 0) {
        console.log("\n❌ PROBLÈME : Aucun ID ne matche !");
        console.log("   → Les matchs en DB ont des IDs ESPN différents de ceux retournés par l'API");
        console.log("   → Possible cause : Les matchs ont été seedés avec une ancienne version de l'API");
      }
    } catch (error) {
      console.error("Erreur API:", error);
    }
  }

  // 4. Check des dates
  console.log("\n" + "═".repeat(80));
  console.log("📅 ANALYSE DES DATES :\n");

  const gamesByDbDate = new Map<string, number>();

  const allGames = await prisma.game.findMany({
    where: {
      season: "2025-26",
      status: { in: ["SCHEDULED", "LIVE"] },
    },
  });

  for (const game of allGames) {
    const dateKey = game.gameDate.toISOString().split("T")[0];
    gamesByDbDate.set(dateKey, (gamesByDbDate.get(dateKey) || 0) + 1);
  }

  console.log("Nombre de matchs par date en DB:");
  let count = 0;
  for (const [date, num] of Array.from(gamesByDbDate.entries()).slice(0, 10)) {
    console.log(`  ${date}: ${num} matchs`);
    count++;
  }
  console.log(`  ... (${gamesByDbDate.size} dates au total)`);

  console.log("\n" + "═".repeat(80) + "\n");

  await prisma.$disconnect();
}

main();
