/**
 * Script de test pour les routes CRON
 * Usage: npx tsx scripts/test-cron.ts [route]
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "test-secret-dev";

// Couleurs console
const colors = {
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
};

async function testRoute(path: string, name: string) {
  console.log(`${colors.yellow}🧪 Test: ${name}${colors.reset}`);
  console.log(`   Route: ${path}\n`);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✅ Succès (${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${colors.red}❌ Erreur (${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`${colors.red}❌ Erreur réseau${colors.reset}`);
    console.error(error);
  }

  console.log(`\n${colors.blue}${"=".repeat(50)}${colors.reset}\n`);
}

async function runTests(route?: string) {
  console.log(`${colors.blue}${"=".repeat(50)}`);
  console.log("   Test des routes CRON NBA Pronos");
  console.log(`${"=".repeat(50)}${colors.reset}\n`);

  switch (route) {
    case "injuries":
      await testRoute("/api/cron/update-injuries", "Mise à jour infirmerie");
      break;

    case "live-scores":
      await testRoute("/api/cron/update-live-scores", "Scores live + standings");
      break;

    case "refresh-games":
      await testRoute("/api/cron/refresh-daily-games", "Détection matchs du jour");
      break;

    case "weekly-digest":
      await testRoute("/api/cron/daily-digest", "Email récap hebdomadaire");
      break;

    case "all":
    default:
      console.log(`${colors.blue}🚀 Lancement de tous les tests CRON...${colors.reset}\n`);

      await testRoute("/api/cron/refresh-daily-games", "1️⃣  Détection matchs du jour");
      await testRoute("/api/cron/update-injuries", "2️⃣  Mise à jour infirmerie");
      await testRoute("/api/cron/update-live-scores", "3️⃣  Scores live + standings");

      console.log(`${colors.yellow}⚠️  Test email hebdo ignoré (évite spam)${colors.reset}`);
      console.log(`   Pour tester: npx tsx scripts/test-cron.ts weekly-digest\n`);

      console.log(`${colors.green}${"=".repeat(50)}`);
      console.log("   Tests terminés !");
      console.log(`${"=".repeat(50)}${colors.reset}`);
      break;
  }
}

// Lancer les tests
const route = process.argv[2];
runTests(route).catch(console.error);
