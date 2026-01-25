/**
 * SCRIPT DE TEST - Trouver la bonne API pour player details
 */

// Test avec quelques joueurs connus
const testPlayers = [
  { name: "Trae Young", espnId: "4277905" },
  { name: "Stephen Curry", espnId: "3975" },
  { name: "LeBron James", espnId: "1966" },
];

const NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
  "Referer": "https://www.nba.com/",
  "Origin": "https://www.nba.com",
};

async function testAPI1_ESPN(espnId: string) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${espnId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const athlete = data.athlete;

    return {
      api: "ESPN",
      height: athlete?.displayHeight,
      weight: athlete?.displayWeight,
      college: athlete?.college?.name || athlete?.college,
      country: athlete?.birthPlace?.country || athlete?.citizenship,
    };
  } catch (error) {
    return null;
  }
}

async function testAPI2_ESPNCore(espnId: string) {
  const url = `http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${espnId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      api: "ESPN Core",
      height: data?.displayHeight,
      weight: data?.displayWeight,
      college: data?.college?.name,
      country: data?.birthPlace?.country,
    };
  } catch (error) {
    return null;
  }
}

async function testAPI3_BallDontLie(playerName: string) {
  const API_KEY = "ee5428a9-ea1e-4ac9-a28d-154d7c87a4b8";
  const url = `https://api.balldontlie.io/v1/players?search=${encodeURIComponent(playerName)}`;

  try {
    const response = await fetch(url, {
      headers: { "Authorization": API_KEY },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const player = data.data?.[0];

    if (!player) return null;

    return {
      api: "BallDontLie",
      height: player.height,
      weight: player.weight,
      college: player.college || null,
      country: player.country || null,
    };
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log("\n🔬 TEST DES APIs POUR PLAYER DETAILS\n");
  console.log("═".repeat(70));

  for (const player of testPlayers) {
    console.log(`\n👤 ${player.name} (ESPN ID: ${player.espnId})\n`);

    // Test ESPN
    console.log("   🔍 Test ESPN site.api...");
    const espn = await testAPI1_ESPN(player.espnId);
    if (espn) {
      console.log(`      ✅ SUCCÈS !`);
      console.log(`         Height: ${espn.height || "N/A"}`);
      console.log(`         Weight: ${espn.weight || "N/A"}`);
      console.log(`         College: ${espn.college || "N/A"}`);
      console.log(`         Country: ${espn.country || "N/A"}`);
    } else {
      console.log(`      ❌ ÉCHEC`);
    }

    // Test ESPN Core
    console.log("   🔍 Test ESPN sports.core.api...");
    const espnCore = await testAPI2_ESPNCore(player.espnId);
    if (espnCore) {
      console.log(`      ✅ SUCCÈS !`);
      console.log(`         Height: ${espnCore.height || "N/A"}`);
      console.log(`         Weight: ${espnCore.weight || "N/A"}`);
      console.log(`         College: ${espnCore.college || "N/A"}`);
      console.log(`         Country: ${espnCore.country || "N/A"}`);
    } else {
      console.log(`      ❌ ÉCHEC`);
    }

    // Test BallDontLie
    console.log("   🔍 Test BallDontLie API...");
    const bdl = await testAPI3_BallDontLie(player.name);
    if (bdl) {
      console.log(`      ✅ SUCCÈS !`);
      console.log(`         Height: ${bdl.height || "N/A"}`);
      console.log(`         Weight: ${bdl.weight || "N/A"}`);
      console.log(`         College: ${bdl.college || "N/A"}`);
      console.log(`         Country: ${bdl.country || "N/A"}`);
    } else {
      console.log(`      ❌ ÉCHEC`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n" + "═".repeat(70));
  console.log("\n✅ Tests terminés !\n");
}

main();
