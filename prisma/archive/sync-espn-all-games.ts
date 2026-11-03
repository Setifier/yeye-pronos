/**
 * Synchronisation complète avec ESPN API
 *
 * Comme le CRON mais pour TOUTES les dates depuis le début de la saison
 * Utilise les mêmes ESPN IDs que les matchs existants
 *
 * Usage: npx tsx prisma/sync-espn-all-games.ts
 *
 * Options:
 * --from=YYYY-MM-DD : Date de début (défaut: 2025-10-22 = début saison)
 * --to=YYYY-MM-DD   : Date de fin (défaut: aujourd'hui)
 * --skip-stats      : Ne pas récupérer les stats (plus rapide)
 */

import { PrismaClient, GameStatus, PredictionResult } from "@/generated/prisma";
import { fetchTodaysGames } from "@/lib/espn";
import { fetchAndSaveGameStatsWithDelay } from "@/lib/espn-stats";
import {
  getScoreMarginCategory,
  calculateTotalPoints,
  ScoreMarginCategory,
} from "@/types/bonus";

const prisma = new PrismaClient();

// Parse arguments
const args = process.argv.slice(2);
const options = {
  from: "2025-10-22", // Début de la saison NBA 2025-26
  to: new Date().toISOString().split("T")[0], // Aujourd'hui
  skipStats: args.includes("--skip-stats"),
};

for (const arg of args) {
  if (arg.startsWith("--from=")) {
    options.from = arg.split("=")[1];
  }
  if (arg.startsWith("--to=")) {
    options.to = arg.split("=")[1];
  }
}

/**
 * Attend un certain nombre de millisecondes
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Génère toutes les dates entre from et to (inclus)
 */
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    dates.push(dateStr);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Mapper le status ESPN vers notre enum
 */
function mapGameStatus(status: string): GameStatus {
  const normalized = status.toUpperCase();

  if (normalized.includes("FINAL")) return GameStatus.FINAL;
  if (normalized.includes("PROGRESS") || normalized.includes("LIVE")) {
    return GameStatus.LIVE;
  }
  if (normalized.includes("POSTPONED")) return GameStatus.POSTPONED;
  if (normalized.includes("CANCELLED")) return GameStatus.CANCELLED;

  return GameStatus.SCHEDULED;
}

/**
 * Synchroniser tous les matchs d'une date
 */
async function syncGamesForDate(date: string, teamMap: Map<string, string>) {
  console.log(`\n📅 Traitement du ${date}...`);

  try {
    // Récupérer les matchs depuis ESPN
    const espnGames = await fetchTodaysGames(date);

    if (espnGames.length === 0) {
      console.log("  ℹ️  Aucun match ce jour");
      return { created: 0, updated: 0, unchanged: 0 };
    }

    console.log(`  📊 ${espnGames.length} matchs trouvés sur ESPN`);

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const game of espnGames) {
      // Mapper les équipes ESPN → DB
      const homeTeamId = teamMap.get(String(game.home_team.id));
      const awayTeamId = teamMap.get(String(game.visitor_team.id));

      if (!homeTeamId || !awayTeamId) {
        console.log(
          `  ⚠️  Match ${game.id} : équipe introuvable (home: ${game.home_team.id}, away: ${game.visitor_team.id})`
        );
        continue;
      }

      // Calculer le winnerId si le match est terminé
      let winnerId: string | null = null;
      if (
        game.status === "Final" &&
        game.home_team_score !== null &&
        game.visitor_team_score !== null
      ) {
        winnerId =
          game.home_team_score > game.visitor_team_score
            ? homeTeamId
            : awayTeamId;
      }

      const gameDate = new Date(game.date);
      const predictionDeadline = new Date(gameDate.getTime() - 30 * 60 * 1000);

      // Vérifier si le match existe (par ESPN ID)
      const existingGame = await prisma.game.findUnique({
        where: { externalId: String(game.id) },
        include: {
          homeTeam: { select: { abbreviation: true } },
          awayTeam: { select: { abbreviation: true } },
        },
      });

      if (!existingGame) {
        // Créer le match
        await prisma.game.create({
          data: {
            externalId: String(game.id),
            season: "2025", // Saison 2025-26
            seasonType: "Regular Season",
            gameDate,
            localGameDate: gameDate,
            status: mapGameStatus(game.status),
            homeTeamId,
            awayTeamId,
            homeScore: game.home_team_score,
            awayScore: game.visitor_team_score,
            winnerId,
            predictionDeadline,
          },
        });
        created++;
        console.log(`  ✅ Créé: ${game.visitor_team.abbreviation} @ ${game.home_team.abbreviation}`);
        continue;
      }

      // ⚠️ ESPN a réassigné l'ID à un autre match (match original reporté)
      // Comparer les abréviations (plus fiable que les IDs qui diffèrent entre APIs)
      const normalizeAbbr = (abbr: string) => {
        const map: Record<string, string> = { GS: "GSW", NY: "NYK", NO: "NOP", SA: "SAS", UTAH: "UTA", WSH: "WAS" };
        return map[abbr] || abbr;
      };
      const teamsChanged =
        existingGame.homeTeam.abbreviation !== normalizeAbbr(game.home_team.abbreviation) ||
        existingGame.awayTeam.abbreviation !== normalizeAbbr(game.visitor_team.abbreviation);

      if (teamsChanged) {
        console.log(
          `  ⚠️  ID ${game.id} réassigné: ${existingGame.awayTeam.abbreviation} @ ${existingGame.homeTeam.abbreviation} → ${game.visitor_team.abbreviation} @ ${game.home_team.abbreviation}`
        );

        // Si le match existant est déjà FINAL/POSTPONED/CANCELLED,
        // on ne peut pas réassigner l'ID (le match a déjà été joué/résolu)
        if (existingGame.status !== "SCHEDULED" && existingGame.status !== "LIVE") {
          console.log(
            `  ⚠️  Match existant déjà ${existingGame.status}, mise à jour ignorée (possible mismatch d'abréviation)`
          );
          unchanged++;
          continue;
        }

        // Mettre l'ancien match en POSTPONED
        await prisma.game.update({
          where: { id: existingGame.id },
          data: {
            status: "POSTPONED",
            externalId: `${existingGame.externalId}_POSTPONED_${Date.now()}`,
            updatedAt: new Date(),
          },
        });

        // Annuler les predictions sur ce match reporté
        const cancelledPredictions = await prisma.prediction.updateMany({
          where: {
            gameId: existingGame.id,
            result: "PENDING",
          },
          data: {
            result: "CANCELLED",
            pointsEarned: 0,
          },
        });

        console.log(
          `  📅 ${existingGame.awayTeam.abbreviation} @ ${existingGame.homeTeam.abbreviation} → Match reporté (${cancelledPredictions.count} prono(s) annulé(s))`
        );

        // Créer le nouveau match avec cet ID (maintenant libre)
        await prisma.game.create({
          data: {
            externalId: String(game.id),
            season: "2025",
            seasonType: "Regular Season",
            gameDate,
            localGameDate: gameDate,
            status: mapGameStatus(game.status),
            homeTeamId,
            awayTeamId,
            homeScore: game.home_team_score,
            awayScore: game.visitor_team_score,
            winnerId,
            predictionDeadline,
          },
        });
        created++;
        console.log(`  ✅ Créé: ${game.visitor_team.abbreviation} @ ${game.home_team.abbreviation}`);
        continue;
      }

      // Vérifier s'il y a des changements
      const needsUpdate =
        existingGame.status !== mapGameStatus(game.status) ||
        existingGame.homeScore !== game.home_team_score ||
        existingGame.awayScore !== game.visitor_team_score ||
        existingGame.gameDate.getTime() !== gameDate.getTime();

      if (!needsUpdate) {
        unchanged++;
        continue;
      }

      // Mettre à jour le match
      await prisma.game.update({
        where: { externalId: String(game.id) },
        data: {
          gameDate,
          localGameDate: gameDate,
          status: mapGameStatus(game.status),
          homeScore: game.home_team_score,
          awayScore: game.visitor_team_score,
          winnerId,
          predictionDeadline,
          updatedAt: new Date(),
        },
      });

      updated++;
    }

    console.log(
      `  ✅ Résumé: ${created} créés, ${updated} mis à jour, ${unchanged} inchangés`
    );

    return { created, updated, unchanged };
  } catch (error) {
    console.error(`  ❌ Erreur:`, error instanceof Error ? error.message : error);
    return { created: 0, updated: 0, unchanged: 0 };
  }
}

/**
 * Récupérer les stats de tous les matchs FINAL
 */
async function syncStatsForFinalGames() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 ÉTAPE 2 : Récupération des stats");
  console.log("=".repeat(60) + "\n");

  // Récupérer tous les matchs FINAL sans stats
  const finalGames = await prisma.game.findMany({
    where: {
      status: "FINAL",
      playerStats: {
        none: {},
      },
    },
    include: {
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
    orderBy: {
      gameDate: "asc",
    },
  });

  console.log(`📊 ${finalGames.length} matchs FINAL sans stats\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < finalGames.length; i++) {
    const game = finalGames[i];

    console.log(
      `[${i + 1}/${finalGames.length}] 🔄 ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} (${game.gameDate.toISOString().split("T")[0]})...`
    );

    try {
      // Récupérer et sauvegarder les stats
      const topScorer = await fetchAndSaveGameStatsWithDelay(
        game.externalId,
        game.id,
        1000
      );

      if (topScorer && game.homeScore !== null && game.awayScore !== null) {
        // Calculer le score margin
        const actualMargin = Math.abs(game.homeScore - game.awayScore);
        const hasOvertime = false; // TODO: détecter overtime depuis ESPN
        const scoreMarginCategory = getScoreMarginCategory(
          game.homeScore,
          game.awayScore,
          hasOvertime
        );

        // Mettre à jour le Game avec les infos bonus
        await prisma.game.update({
          where: { id: game.id },
          data: {
            topScorerId: topScorer.playerId,
            topScorerPoints: topScorer.points,
            actualScoreMargin: actualMargin,
            scoreMarginCategory,
            hasOvertime,
          },
        });

        console.log(
          `  ✅ Top scorer: ${topScorer.playerName} (${topScorer.points} pts)`
        );
      } else {
        console.log(`  ⚠️  Pas de stats disponibles`);
      }

      success++;
    } catch (error) {
      console.error(`  ❌ Erreur:`, error instanceof Error ? error.message : error);
      errors++;

      // Si erreur 429 (rate limit), attendre plus longtemps
      if (error instanceof Error && error.message.includes("429")) {
        console.log(`  ⏳ Rate limit atteint, pause de 10 secondes...`);
        await delay(10000);
      }
    }

    // Log de progression tous les 25 matchs
    if ((i + 1) % 25 === 0) {
      console.log(
        `\n📊 Progression: ${i + 1}/${finalGames.length} (${Math.round(((i + 1) / finalGames.length) * 100)}%)\n`
      );
    }
  }

  console.log(`\n✅ Stats récupérées: ${success} succès, ${errors} erreurs`);
}

/**
 * Calcule/recalcule les pronos pour les matchs FINAL
 * - Calcule les pronos PENDING
 * - Corrige les pronos WON/LOST si le résultat ou les points sont incorrects
 */
async function calculatePredictions() {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 ÉTAPE 3 : Calcul des pronostics");
  console.log("=".repeat(60) + "\n");

  // Déterminer la saison actuelle pour les stats joueurs
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const seasonYear = currentMonth >= 9 ? currentYear : currentYear - 1;
  const nextYearShort = (seasonYear + 1).toString().slice(-2);
  const currentSeason = `${seasonYear}-${nextYearShort}`;

  // Récupérer tous les matchs FINAL avec des pronos
  const gamesWithPredictions = await prisma.game.findMany({
    where: {
      status: "FINAL",
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: {
        some: {},
      },
    },
    include: {
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
      topScorer: { select: { lastName: true } },
      predictions: {
        include: {
          user: { select: { name: true } },
          predictedTopScorer: {
            include: {
              seasonStats: {
                where: { season: currentSeason },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { gameDate: "asc" },
  });

  console.log(`📊 ${gamesWithPredictions.length} matchs FINAL avec pronos\n`);

  let calculated = 0;
  let corrected = 0;
  let unchanged = 0;

  for (const game of gamesWithPredictions) {
    if (game.homeScore === null || game.awayScore === null) continue;

    const winnerId =
      game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;

    // Calculer le scoreMarginCategory
    const actualMargin = Math.abs(game.homeScore - game.awayScore);
    const scoreMarginCategory =
      (game.scoreMarginCategory as ScoreMarginCategory) ??
      getScoreMarginCategory(
        game.homeScore,
        game.awayScore,
        game.hasOvertime ?? false
      );

    // Mettre à jour le match si des infos manquent
    if (!game.winnerId || !game.scoreMarginCategory || !game.actualScoreMargin) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          winnerId: game.winnerId ?? winnerId,
          scoreMarginCategory: game.scoreMarginCategory ?? scoreMarginCategory,
          actualScoreMargin: game.actualScoreMargin ?? actualMargin,
        },
      });
    }

    for (const prediction of game.predictions) {
      const didWin = prediction.predictedTeamId === winnerId;
      const expectedResult: PredictionResult = didWin ? "WON" : "LOST";

      // Récupérer la moyenne du joueur prédit
      const predictedTopScorerAverage =
        prediction.predictedTopScorer?.seasonStats?.[0]?.pointsPerGame ?? 0;

      // Calculer les points attendus
      const bonusResult = calculateTotalPoints({
        predictionWon: didWin,
        predictedMargin:
          (prediction.predictedScoreMargin as ScoreMarginCategory) ?? null,
        actualMargin: scoreMarginCategory,
        predictedTopScorerId: prediction.predictedTopScorerId,
        actualTopScorerId: game.topScorerId,
        predictedTopScorerAverage,
      });

      // Vérifier si mise à jour nécessaire
      const needsUpdate =
        prediction.result !== expectedResult ||
        prediction.pointsEarned !== bonusResult.total ||
        prediction.marginBonusPoints !== bonusResult.marginBonus ||
        prediction.topScorerBonusPoints !== bonusResult.topScorerBonus ||
        prediction.comboBonusPoints !== bonusResult.comboBonus;

      if (!needsUpdate) {
        unchanged++;
        continue;
      }

      // Déterminer si c'est un nouveau calcul ou une correction
      const isPending = prediction.result === "PENDING";
      const isCorrection = !isPending && needsUpdate;

      // Mettre à jour le prono
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          result: expectedResult,
          pointsEarned: bonusResult.total,
          marginBonusPoints: bonusResult.marginBonus,
          topScorerBonusPoints: bonusResult.topScorerBonus,
          comboBonusPoints: bonusResult.comboBonus,
        },
      });

      if (isPending) {
        calculated++;
      } else if (isCorrection) {
        corrected++;
        console.log(
          `🔧 Corrigé: ${prediction.user.name} sur ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`
        );
        console.log(
          `   Ancien: ${prediction.result} (${prediction.pointsEarned} pts) → Nouveau: ${expectedResult} (${bonusResult.total} pts)`
        );
      }
    }
  }

  console.log(`\n✅ Pronos traités:`);
  console.log(`   - ${calculated} calculés (étaient PENDING)`);
  console.log(`   - ${corrected} corrigés (bugs rattrapés)`);
  console.log(`   - ${unchanged} déjà corrects`);
}

/**
 * Main
 */
async function main() {
  console.log("🚀 SYNCHRONISATION COMPLÈTE AVEC ESPN API\n");
  console.log(`📅 Période: ${options.from} → ${options.to}`);
  console.log(`📊 Stats: ${options.skipStats ? "NON" : "OUI"}\n`);

  try {
    // Récupérer toutes les équipes pour le mapping ESPN ID → DB ID
    const teams = await prisma.team.findMany({
      select: { id: true, externalId: true },
    });
    const teamMap = new Map(teams.map((t) => [t.externalId, t.id]));

    console.log(`📊 ${teams.length} équipes en DB pour le mapping\n`);

    console.log("=".repeat(60));
    console.log("📅 ÉTAPE 1 : Synchronisation des matchs");
    console.log("=".repeat(60));

    // Générer toutes les dates
    const dates = generateDateRange(options.from, options.to);
    console.log(`📅 ${dates.length} dates à traiter\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const result = await syncGamesForDate(date, teamMap);

      totalCreated += result.created;
      totalUpdated += result.updated;
      totalUnchanged += result.unchanged;

      // Rate limiting ESPN (pas trop agressif)
      if (i < dates.length - 1) {
        await delay(500); // 500ms entre chaque date
      }

      // Log de progression tous les 7 jours
      if ((i + 1) % 7 === 0) {
        console.log(
          `\n📊 Progression: ${i + 1}/${dates.length} dates (${Math.round(((i + 1) / dates.length) * 100)}%)`
        );
        console.log(`  Total: ${totalCreated} créés, ${totalUpdated} mis à jour\n`);
      }
    }

    console.log("\n✅ ÉTAPE 1 TERMINÉE");
    console.log(`  - ${totalCreated} matchs créés`);
    console.log(`  - ${totalUpdated} matchs mis à jour`);
    console.log(`  - ${totalUnchanged} matchs inchangés`);

    // Étape 2 : Stats
    if (!options.skipStats) {
      await syncStatsForFinalGames();
    } else {
      console.log("\n⏭️  ÉTAPE 2 SKIPPÉE (--skip-stats)");
    }

    // Étape 3 : Calcul des pronos
    await calculatePredictions();

    console.log("\n" + "=".repeat(60));
    console.log("✅ SYNCHRONISATION TERMINÉE AVEC SUCCÈS !");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Erreur fatale:", error);
    throw error;
  }
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
