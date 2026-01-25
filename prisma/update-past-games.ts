/**
 * Script pour mettre à jour les résultats des matchs passés
 * Usage: npx tsx prisma/update-past-games.ts
 */

import { PrismaClient } from "@/generated/prisma";
import { fetchTodaysGames } from "@/lib/espn";

const prisma = new PrismaClient();

async function updateGamesForDate(dateString: string) {
  console.log(`\n📅 Mise à jour des matchs du ${dateString}...`);

  try {
    // Récupérer les matchs depuis ESPN
    const espnGames = await fetchTodaysGames(dateString);
    console.log(`   ✅ ${espnGames.length} matchs trouvés sur ESPN`);

    if (espnGames.length === 0) {
      console.log(`   ℹ️  Aucun match pour cette date`);
      return { updated: 0, calculated: 0 };
    }

    let updated = 0;
    let calculated = 0;

    for (const espnGame of espnGames) {
      // Trouver le match en DB
      const dbGame = await prisma.game.findUnique({
        where: { externalId: espnGame.id },
        include: {
          predictions: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!dbGame) {
        console.log(`   ⚠️  Match ${espnGame.id} non trouvé en DB`);
        continue;
      }

      // Mapper le status ESPN
      let newStatus: "SCHEDULED" | "LIVE" | "FINAL" = "SCHEDULED";
      if (espnGame.status === "Final" || espnGame.status === "FINAL") {
        newStatus = "FINAL";
      } else if (espnGame.status === "InProgress" || espnGame.status === "LIVE") {
        newStatus = "LIVE";
      }

      const wasNotFinal = dbGame.status !== "FINAL";
      const nowFinal = newStatus === "FINAL";

      // Mettre à jour le match
      await prisma.game.update({
        where: { id: dbGame.id },
        data: {
          status: newStatus,
          homeScore: espnGame.home_team_score ?? null,
          awayScore: espnGame.visitor_team_score ?? null,
          winnerId:
            nowFinal && espnGame.home_team_score !== null && espnGame.visitor_team_score !== null
              ? espnGame.home_team_score > espnGame.visitor_team_score
                ? dbGame.homeTeamId
                : dbGame.awayTeamId
              : null,
        },
      });

      updated++;
      console.log(`   ♻️  ${espnGame.visitor_team.abbreviation} @ ${espnGame.home_team.abbreviation}: ${espnGame.visitor_team_score ?? "-"} - ${espnGame.home_team_score ?? "-"} (${newStatus})`);

      // Si le match est terminé et qu'il y a des pronos à calculer
      if (nowFinal && wasNotFinal && dbGame.predictions.length > 0) {
        const winnerId =
          espnGame.home_team_score! > espnGame.visitor_team_score!
            ? dbGame.homeTeamId
            : dbGame.awayTeamId;

        console.log(`   🏆 Calcul des pronos...`);

        for (const prediction of dbGame.predictions) {
          const didWin = prediction.predictedTeamId === winnerId;
          const points = didWin ? 10 : 0;

          await prisma.prediction.update({
            where: { id: prediction.id },
            data: {
              result: didWin ? "WON" : "LOST",
              pointsEarned: points,
            },
          });

          const emoji = didWin ? "✅" : "❌";
          console.log(`      ${emoji} ${prediction.user.name}: ${points} points`);
          calculated++;
        }
      }
    }

    return { updated, calculated };
  } catch (error) {
    console.error(`   ❌ Erreur:`, error);
    throw error;
  }
}

async function main() {
  console.log("🏀 Mise à jour des résultats des matchs NBA\n");
  console.log("⚠️  Saison 2025-2026\n");

  const dates = [
    "2025-12-23",
    "2025-12-24",
    "2025-12-25",
    "2025-12-26",
  ];

  let totalUpdated = 0;
  let totalCalculated = 0;

  for (const date of dates) {
    const { updated, calculated } = await updateGamesForDate(date);
    totalUpdated += updated;
    totalCalculated += calculated;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Résumé:`);
  console.log(`   ♻️  Matchs mis à jour: ${totalUpdated}`);
  console.log(`   🏆 Pronos calculés: ${totalCalculated}`);
  console.log("=".repeat(60) + "\n");

  // Afficher les stats des pronos
  console.log("📈 Statistiques des pronos:");
  const stats = await prisma.prediction.groupBy({
    by: ["result"],
    _count: {
      id: true,
    },
    _sum: {
      pointsEarned: true,
    },
  });

  for (const stat of stats) {
    const emoji = stat.result === "WON" ? "✅" : stat.result === "LOST" ? "❌" : "⏳";
    console.log(`   ${emoji} ${stat.result}: ${stat._count.id} pronos (${stat._sum.pointsEarned ?? 0} points)`);
  }

  console.log("\n✅ Terminé !\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
