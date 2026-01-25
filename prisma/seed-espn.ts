/**
 * Seed NBA avec ESPN API (VRAIES HEURES des matchs)
 *
 * ESPN fournit les heures exactes des matchs (contrairement à BallDontLie)
 * Format de date ESPN : ISO 8601 avec timezone (ex: 2025-12-22T00:30:00Z)
 *
 * Usage:
 *   npm run db:seed-espn
 *
 * Ce script :
 * 1. Charge les équipes existantes depuis la DB
 * 2. Seed les matchs de la saison 2025-26 depuis ESPN avec les VRAIES heures
 */

import { prisma } from "../src/lib/prisma";
import { getGamesByDate, parseESPNGame } from "../src/lib/espn";
import { getTeamTimezone } from "../src/lib/nba-timezones";

/**
 * Convertir une date UTC en date locale d'une timezone donnée
 */
function convertToLocalDate(utcDate: Date, timezone: string): Date {
  // Formater la date en heure locale de la timezone
  const localString = utcDate.toLocaleString("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Parser le string local pour créer une Date "naive" (sans timezone)
  // Format: "MM/DD/YYYY, HH:mm:ss"
  const [datePart, timePart] = localString.split(", ");
  const [month, day, year] = datePart.split("/");
  const [hour, minute, second] = timePart.split(":");

  // Créer une date en UTC qui représente l'heure locale
  // C'est une "fake" date UTC qui a les mêmes chiffres que l'heure locale
  return new Date(Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  ));
}

// Mapping des abréviations ESPN → NBA officiel
const ESPN_TO_NBA_ABBREVIATIONS: Record<string, string> = {
  WSH: "WAS", // Washington
  NY: "NYK",  // New York
  SA: "SAS",  // San Antonio
  NO: "NOP",  // New Orleans
  GS: "GSW",  // Golden State
  UTAH: "UTA", // Utah
};

/**
 * Convertir l'abréviation ESPN en abréviation NBA officielle
 */
function normalizeAbbreviation(espnAbbr: string): string {
  return ESPN_TO_NBA_ABBREVIATIONS[espnAbbr] || espnAbbr;
}

// Mapping des statuts
function mapGameStatus(
  status: string
): "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED" {
  const normalized = status.toUpperCase();

  if (normalized.includes("FINAL")) return "FINAL";
  if (
    normalized.includes("PROGRESS") ||
    normalized.includes("LIVE") ||
    normalized.includes("HALFTIME")
  )
    return "LIVE";
  if (normalized.includes("POSTPONED") || normalized.includes("PPD"))
    return "POSTPONED";
  if (normalized.includes("CANCELLED") || normalized.includes("CANCELED"))
    return "CANCELLED";

  return "SCHEDULED";
}

/**
 * Charger les équipes existantes depuis la DB
 */
async function loadExistingTeams() {
  console.log("🏀 Chargement des équipes existantes...");

  const teams = await prisma.team.findMany({
    select: {
      id: true,
      abbreviation: true,
      name: true,
      city: true,
    },
  });

  console.log(`✅ ${teams.length} équipes trouvées en DB`);

  // Créer la map par abbreviation pour matcher avec ESPN
  const teamsByAbbr = new Map<string, string>(); // abbreviation -> UUID

  for (const team of teams) {
    teamsByAbbr.set(team.abbreviation, team.id);
    console.log(`  ✅ ${team.city} ${team.name} (${team.abbreviation})`);
  }

  console.log("");
  return teamsByAbbr;
}

/**
 * Générer les dates pour la saison NBA 2025-26
 * Début : 21 octobre 2025
 * Fin : 12 avril 2026 (saison régulière)
 */
function generateSeasonDates(): string[] {
  const dates: string[] = [];
  const startDate = new Date("2025-10-21");
  const endDate = new Date("2026-04-12");

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Format YYYYMMDD pour ESPN
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    dates.push(`${year}${month}${day}`);

    // Jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Seed les matchs depuis ESPN avec les VRAIES heures
 */
async function seedGames(teamsByAbbr: Map<string, string>) {
  console.log("🏀 Seed des matchs NBA depuis ESPN...");

  const dates = generateSeasonDates();
  console.log(`📅 ${dates.length} dates à traiter (saison 2025-26)`);

  let totalGames = 0;
  let processedDates = 0;

  for (const date of dates) {
    try {
      console.log(`\n📅 ${date}...`);

      const response = await getGamesByDate(date);
      const games = response.events;

      if (games.length === 0) {
        console.log(`  ℹ️  Pas de matchs`);
        processedDates++;
        continue;
      }

      console.log(`  📥 ${games.length} matchs trouvés`);

      for (const espnGame of games) {
        const parsed = parseESPNGame(espnGame);

        // Normaliser les abréviations ESPN → NBA officiel
        const homeAbbr = normalizeAbbreviation(parsed.homeTeam.abbreviation);
        const awayAbbr = normalizeAbbreviation(parsed.awayTeam.abbreviation);

        // Matcher les équipes par abbreviation
        const homeTeamId = teamsByAbbr.get(homeAbbr);
        const awayTeamId = teamsByAbbr.get(awayAbbr);

        if (!homeTeamId || !awayTeamId) {
          console.warn(
            `  ⚠️  Équipe introuvable : ${parsed.awayTeam.abbreviation} (${awayAbbr}) @ ${parsed.homeTeam.abbreviation} (${homeAbbr})`
          );
          continue;
        }

        // Calculer la date locale (timezone de l'équipe qui reçoit)
        const homeTeamTimezone = getTeamTimezone(homeAbbr);
        const localGameDate = convertToLocalDate(parsed.date, homeTeamTimezone);

        // La deadline est 30 minutes avant le match
        const predictionDeadline = new Date(
          parsed.date.getTime() - 30 * 60 * 1000
        );

        // Calculer le winner si le match est terminé
        let winnerId: string | null = null;
        if (
          parsed.status === "FINAL" &&
          parsed.homeScore !== null &&
          parsed.awayScore !== null
        ) {
          winnerId = parsed.homeScore > parsed.awayScore ? homeTeamId : awayTeamId;
        }

        await prisma.game.upsert({
          where: { externalId: parsed.externalId },
          update: {
            gameDate: parsed.date,
            localGameDate,
            status: parsed.status,
            homeScore: parsed.homeScore,
            awayScore: parsed.awayScore,
            winnerId,
            predictionDeadline,
            updatedAt: new Date(),
          },
          create: {
            externalId: parsed.externalId,
            season: "2025-26",
            seasonType: "Regular Season",
            gameDate: parsed.date,
            localGameDate,
            status: parsed.status,
            homeTeamId,
            awayTeamId,
            homeScore: parsed.homeScore,
            awayScore: parsed.awayScore,
            winnerId,
            predictionDeadline,
          },
        });

        totalGames++;
        console.log(
          `    ✅ ${awayAbbr} @ ${homeAbbr} - ${parsed.date.toISOString()}`
        );
      }

      processedDates++;

      // Petit délai pour ne pas surcharger l'API ESPN (même si elle est gratuite)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ Erreur pour ${date}:`, error);
      // Continuer avec la prochaine date
    }
  }

  console.log(
    `\n✅ ${totalGames} matchs créés/mis à jour sur ${processedDates} dates`
  );
}

/**
 * Main
 */
async function main() {
  console.log("🚀 Seed NBA avec ESPN (VRAIES HEURES)\n");

  // 1. Charger les équipes existantes depuis la DB (pas besoin de les recréer)
  const teamsByAbbr = await loadExistingTeams();

  // 2. Seed des matchs depuis ESPN avec les vraies heures
  await seedGames(teamsByAbbr);

  console.log("\n✨ Seed terminé avec succès !");
  console.log("Les matchs ont maintenant leurs VRAIES heures locales américaines !");
}

main()
  .then(() => {
    console.log("\n✅ Processus terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  });
