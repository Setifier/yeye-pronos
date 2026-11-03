/**
 * Script pour récupérer les headshots des joueurs depuis ESPN CDN
 *
 * Format ESPN: https://a.espncdn.com/i/headshots/nba/players/full/{ESPN_ID}.png
 *
 * Usage: npx tsx prisma/fetch-player-headshots.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const ESPN_HEADSHOT_BASE_URL = "https://a.espncdn.com/i/headshots/nba/players/full";

/**
 * Vérifie si une URL d'image existe
 */
async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok && (response.headers.get("content-type")?.startsWith("image/") ?? false);
  } catch {
    return false;
  }
}

/**
 * Récupère le headshot d'un joueur depuis ESPN
 */
async function fetchPlayerHeadshot(externalId: string): Promise<string | null> {
  const headshotUrl = `${ESPN_HEADSHOT_BASE_URL}/${externalId}.png`;

  const exists = await imageExists(headshotUrl);
  if (exists) {
    console.log(`  ✅ Headshot trouvé: ${headshotUrl}`);
    return headshotUrl;
  }

  console.log(`  ❌ Headshot non trouvé pour ID ${externalId}`);
  return null;
}

async function main() {
  console.log("═".repeat(80));
  console.log("🏀 RÉCUPÉRATION DES HEADSHOTS DES JOUEURS NBA");
  console.log("═".repeat(80));
  console.log(`📅 Date : ${new Date().toLocaleString("fr-FR")}`);
  console.log(`🌐 Source : ESPN CDN`);
  console.log("═".repeat(80));

  // Récupérer tous les joueurs qui n'ont pas encore de headshot
  const playersWithoutHeadshot = await prisma.player.findMany({
    where: {
      headshot: null,
    },
    select: {
      id: true,
      externalId: true,
      fullName: true,
      team: {
        select: {
          abbreviation: true,
        },
      },
    },
  });

  console.log(`\n📊 ${playersWithoutHeadshot.length} joueurs sans headshot trouvés\n`);

  let updated = 0;
  let notFound = 0;

  for (const player of playersWithoutHeadshot) {
    console.log(`\n🏀 ${player.fullName} (${player.team?.abbreviation || "FA"})`);

    const headshotUrl = await fetchPlayerHeadshot(player.externalId);

    if (headshotUrl) {
      await prisma.player.update({
        where: { id: player.id },
        data: { headshot: headshotUrl },
      });
      updated++;
    } else {
      notFound++;
    }

    // Rate limiting léger pour ne pas surcharger ESPN
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n" + "═".repeat(80));
  console.log("📊 RÉSULTATS");
  console.log("═".repeat(80));
  console.log(`✅ Headshots récupérés: ${updated}`);
  console.log(`❌ Headshots non trouvés: ${notFound}`);
  console.log(`📝 Total traité: ${playersWithoutHeadshot.length}`);
  console.log("═".repeat(80));
}

main()
  .then(() => {
    console.log("\n✅ Script terminé avec succès !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script échoué:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
