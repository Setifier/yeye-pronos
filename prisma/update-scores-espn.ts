/**
 * ═══════════════════════════════════════════════════════════════════════
 * UPDATE SCORES - ESPN API
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Met à jour les scores des matchs depuis l'API ESPN
 * Compatible avec les matchs seedés depuis ESPN (IDs 401809xxx)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PrismaClient, GameStatus } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const CURRENT_SEASON = "2025-26";
const ESPN_SCOREBOARD_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

// Rate limiting
const DELAY_MS = 2000; // 2 secondes entre chaque requête

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapGameStatus(status: string): GameStatus {
  const normalized = status.toLowerCase();

  // ESPN format: "STATUS_FINAL", "STATUS_IN_PROGRESS", etc.
  if (normalized.includes("final")) return "FINAL";
  if (normalized.includes("in_progress") || normalized.includes("live")) return "LIVE";
  if (normalized.includes("postponed")) return "POSTPONED";
  if (normalized.includes("cancel")) return "CANCELLED"; // Handles both "cancelled" and "canceled"

  return "SCHEDULED";
}

interface ESPNGame {
  id: string;
  status: {
    type: {
      name: string;
      state: string;
      completed: boolean;
    };
  };
  competitions: Array<{
    competitors: Array<{
      id: string;
      homeAway: "home" | "away";
      score: string;
      team: {
        id: string;
      };
    }>;
  }>;
}

async function fetchScoreboardByDate(date: string): Promise<ESPNGame[]> {
  const url = `${ESPN_SCOREBOARD_API}?dates=${date.replace(/-/g, "")}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`   ❌ Erreur fetch ESPN pour ${date}:`, error);
    return [];
  }
}

async function updateScores() {
  console.log("═".repeat(80));
  console.log("🏀 UPDATE SCORES - ESPN API");
  console.log("═".repeat(80));
  console.log(`📅 Date : ${new Date().toLocaleString("fr-FR")}`);
  console.log(`🏆 Saison : ${CURRENT_SEASON}`);
  console.log("═".repeat(80));

  try {
    // 1. Récupérer tous les matchs qui ne sont pas FINAL
    console.log("\n📋 Récupération des matchs à mettre à jour...");

    const gamesToUpdate = await prisma.game.findMany({
      where: {
        season: CURRENT_SEASON,
        status: {
          in: ["SCHEDULED", "LIVE"],
        },
      },
      include: {
        homeTeam: { select: { abbreviation: true, externalId: true } },
        awayTeam: { select: { abbreviation: true, externalId: true } },
      },
      orderBy: { gameDate: "asc" },
    });

    console.log(`   ✅ ${gamesToUpdate.length} matchs à vérifier`);

    if (gamesToUpdate.length === 0) {
      console.log("\n✅ Aucun match à mettre à jour !");
      return;
    }

    // 2. Grouper par date US Eastern (timezone des matchs NBA)
    const gamesByDate = new Map<string, typeof gamesToUpdate>();

    // Formatter pour convertir UTC → Eastern Time → YYYY-MM-DD
    const easternFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    for (const game of gamesToUpdate) {
      // Convertir la date UTC en date Eastern (format YYYY-MM-DD)
      const dateKey = easternFormatter.format(game.gameDate);
      if (!gamesByDate.has(dateKey)) {
        gamesByDate.set(dateKey, []);
      }
      gamesByDate.get(dateKey)!.push(game);
    }

    console.log(`   📅 ${gamesByDate.size} dates à traiter\n`);

    // 3. Mettre à jour date par date
    let totalUpdated = 0;
    let dateIndex = 0;

    for (const [dateStr, games] of gamesByDate) {
      dateIndex++;
      console.log(
        `📄 Date ${dateIndex}/${gamesByDate.size} : ${dateStr} (${games.length} matchs)`
      );

      // Fetch scoreboard ESPN pour cette date
      const espnGames = await fetchScoreboardByDate(dateStr);
      console.log(`   🌐 ${espnGames.length} matchs reçus de ESPN`);

      if (espnGames.length === 0) {
        console.log(`   ⚠️  Aucun match ESPN pour cette date\n`);
        continue;
      }

      // Créer un Map pour accès rapide par ID
      const espnGamesMap = new Map(espnGames.map((g) => [g.id, g]));

      // Mettre à jour chaque match
      for (const dbGame of games) {
        const espnGame = espnGamesMap.get(dbGame.externalId);

        if (!espnGame) {
          console.log(
            `   ⚠️  ${dbGame.awayTeam.abbreviation} @ ${dbGame.homeTeam.abbreviation} - Pas dans ESPN`
          );
          continue;
        }

        // Parser les scores
        const competition = espnGame.competitions[0];
        const homeCompetitor = competition.competitors.find((c) => c.homeAway === "home");
        const awayCompetitor = competition.competitors.find((c) => c.homeAway === "away");

        const homeScore = homeCompetitor ? parseInt(homeCompetitor.score) : null;
        const awayScore = awayCompetitor ? parseInt(awayCompetitor.score) : null;
        const newStatus = mapGameStatus(espnGame.status.type.name);

        // Vérifier si mise à jour nécessaire
        const needsUpdate =
          newStatus !== dbGame.status ||
          homeScore !== dbGame.homeScore ||
          awayScore !== dbGame.awayScore;

        if (!needsUpdate) {
          continue;
        }

        // Calculer le winnerId
        let winnerId: string | null = null;
        if (newStatus === "FINAL" && homeScore !== null && awayScore !== null) {
          winnerId = homeScore > awayScore ? dbGame.homeTeamId : dbGame.awayTeamId;
        }

        // Update en DB
        await prisma.game.update({
          where: { id: dbGame.id },
          data: {
            status: newStatus,
            homeScore,
            awayScore,
            winnerId,
            updatedAt: new Date(),
          },
        });

        totalUpdated++;

        const scoreDisplay =
          homeScore !== null && awayScore !== null
            ? `${awayScore}-${homeScore}`
            : "N/A";

        console.log(
          `   ✅ ${dbGame.awayTeam.abbreviation} @ ${dbGame.homeTeam.abbreviation} → ${scoreDisplay} (${newStatus})`
        );
      }

      console.log(`   ✅ Date ${dateStr} traitée\n`);

      // Rate limiting
      if (dateIndex < gamesByDate.size) {
        console.log(`   ⏳ Attente ${DELAY_MS / 1000}s...\n`);
        await sleep(DELAY_MS);
      }
    }

    console.log("═".repeat(80));
    console.log("✅ MISE À JOUR TERMINÉE !");
    console.log("═".repeat(80));
    console.log(`📊 ${totalUpdated} matchs mis à jour`);
    console.log("═".repeat(80) + "\n");
  } catch (error) {
    console.error("\n" + "═".repeat(80));
    console.error("❌ ERREUR FATALE");
    console.error("═".repeat(80));
    console.error(error);
    console.error("═".repeat(80) + "\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateScores();
