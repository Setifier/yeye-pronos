/**
 * SCRIPT ULTIME NBA - API OFFICIELLE NBA.COM
 * Saison 2025-2026 | Date : 1er janvier 2026
 *
 * Utilise l'API officielle stats.nba.com
 * Source de TOUTES les données NBA
 */

import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const CURRENT_SEASON = "2025-2026";
const NBA_SEASON = "2025-26"; // Format NBA API

// Headers requis pour l'API NBA
const NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
  "Referer": "https://www.nba.com/",
  "Origin": "https://www.nba.com",
};

// Mapping ESPN → DB
const ESPN_TO_DB_ABBR: { [key: string]: string } = {
  NO: "NOP", GS: "GSW", NY: "NYK", SA: "SAS", UTAH: "UTA", WSH: "WAS",
};

function normalizeAbbr(abbr: string): string {
  return ESPN_TO_DB_ABBR[abbr] || abbr;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 1. STANDINGS - API NBA OFFICIELLE
// ============================================

async function fetchStandingsFromNBA() {
  console.log("\n📊 Récupération des standings depuis NBA.com...");

  try {
    // API officielle NBA pour les standings
    const url = `https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=${NBA_SEASON}&SeasonType=Regular+Season`;

    const response = await fetch(url, { headers: NBA_HEADERS });

    if (!response.ok) {
      throw new Error(`NBA API error: ${response.status}`);
    }

    const data = await response.json();
    const standings = data.resultSets?.[0];

    if (!standings || !standings.rowSet) {
      console.log("   ⚠️  Structure standings non trouvée");
      return { success: false, count: 0 };
    }

    const headers = standings.headers;
    const rows = standings.rowSet;

    console.log(`   📋 ${rows.length} équipes trouvées`);

    // Indexes des colonnes importantes
    const idxTeamAbbr = headers.indexOf("TeamSlug");
    const idxWins = headers.indexOf("WINS");
    const idxLosses = headers.indexOf("LOSSES");
    const idxWinPct = headers.indexOf("WinPCT");
    const idxHome = headers.indexOf("HOME");
    const idxRoad = headers.indexOf("ROAD");
    const idxStreak = headers.indexOf("strCurrentStreak");

    const teams: any[] = [];

    for (const row of rows) {
      const abbr = normalizeAbbr(row[idxTeamAbbr]);
      const wins = parseInt(row[idxWins] || 0);
      const losses = parseInt(row[idxLosses] || 0);
      const winPct = parseFloat(row[idxWinPct] || 0) * 100;
      const homeRecord = row[idxHome] || "0-0";
      const roadRecord = row[idxRoad] || "0-0";
      const streak = row[idxStreak] || "-";

      teams.push({
        abbreviation: abbr,
        wins,
        losses,
        winPct,
        homeRecord,
        awayRecord: roadRecord,
        currentStreak: streak,
      });
    }

    return await saveTeamStandings(teams);
  } catch (error) {
    console.log("   ❌ Erreur NBA API:", error);
    return { success: false, count: 0 };
  }
}

async function saveTeamStandings(teams: any[]) {
  console.log(`   💾 Sauvegarde de ${teams.length} équipes...`);

  let updated = 0;

  for (const teamData of teams) {
    const team = await prisma.team.findFirst({
      where: { abbreviation: teamData.abbreviation },
    });

    if (!team) {
      console.log(`   ⚠️  ${teamData.abbreviation} non trouvée en DB`);
      continue;
    }

    await prisma.teamSeasonStats.upsert({
      where: {
        teamId_season: { teamId: team.id, season: CURRENT_SEASON },
      },
      create: {
        teamId: team.id,
        season: CURRENT_SEASON,
        wins: teamData.wins,
        losses: teamData.losses,
        winPct: teamData.winPct,
        homeRecord: teamData.homeRecord,
        awayRecord: teamData.awayRecord,
        currentStreak: teamData.currentStreak,
        pointsPerGame: 0,
        pointsAllowedPerGame: 0,
        pointDifferential: 0,
      },
      update: {
        wins: teamData.wins,
        losses: teamData.losses,
        winPct: teamData.winPct,
        homeRecord: teamData.homeRecord,
        awayRecord: teamData.awayRecord,
        currentStreak: teamData.currentStreak,
      },
    });

    updated++;
  }

  console.log(`   ✅ ${updated} équipes mises à jour`);
  return { success: true, count: updated };
}

// ============================================
// 2. INFOS JOUEURS - MÉTHODE COMBINÉE
// ============================================

async function fetchAllPlayersFromNBA() {
  console.log("\n👤 Récupération de tous les joueurs actifs NBA.com...");

  try {
    // API pour obtenir tous les joueurs de la saison
    const url = `https://stats.nba.com/stats/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=${NBA_SEASON}&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`;

    const response = await fetch(url, { headers: NBA_HEADERS });

    if (!response.ok) {
      throw new Error(`NBA API error: ${response.status}`);
    }

    const data = await response.json();
    const players = data.resultSets?.[0];

    if (!players || !players.rowSet) {
      console.log("   ⚠️  Aucun joueur trouvé");
      return [];
    }

    const headers = players.headers;
    const rows = players.rowSet;

    console.log(`   📋 ${rows.length} joueurs actifs trouvés dans NBA.com`);

    const idxPlayerId = headers.indexOf("PLAYER_ID");
    const idxPlayerName = headers.indexOf("PLAYER_NAME");

    const playerIds = rows.map((row: any) => ({
      nbaId: row[idxPlayerId].toString(),
      name: row[idxPlayerName],
    }));

    return playerIds;
  } catch (error) {
    console.log("   ❌ Erreur récupération joueurs NBA:", error);
    return [];
  }
}

async function fetchPlayerDetails() {
  console.log("\n👤 Récupération des détails des joueurs...");

  // D'abord récupérer tous les joueurs actifs de NBA.com
  const nbaPlayers = await fetchAllPlayersFromNBA();

  if (nbaPlayers.length === 0) {
    console.log("   ⚠️  Impossible de récupérer la liste des joueurs NBA");
    console.log("   🔄 Utilisation de la liste en DB...");
  }

  const dbPlayers = await prisma.player.findMany({
    where: { externalId: { not: "" } },
  });

  console.log(`   📋 ${dbPlayers.length} joueurs en DB à mettre à jour`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < dbPlayers.length; i++) {
    const player = dbPlayers[i];

    try {
      // Essayer ESPN d'abord (a les infos physiques)
      const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${player.externalId}`;
      const response = await fetch(espnUrl);

      if (response.ok) {
        const data = await response.json();
        const athlete = data.athlete;

        if (athlete) {
          const height = athlete.displayHeight || athlete.height || null;
          const weight = athlete.displayWeight || athlete.weight || null;
          const weightNum = weight ? weight.toString().replace(/\D/g, "") : null;

          let college = null;
          if (athlete.college?.name) college = athlete.college.name;
          else if (typeof athlete.college === "string") college = athlete.college;
          else if (athlete.highSchool?.name) college = athlete.highSchool.name;

          let country = "USA";
          if (athlete.birthPlace?.country) country = athlete.birthPlace.country;
          else if (athlete.citizenship) country = athlete.citizenship;

          await prisma.player.update({
            where: { id: player.id },
            data: { height, weight: weightNum, college, country },
          });

          updated++;

          if ((i + 1) % 50 === 0) {
            console.log(`   ⏳ ${i + 1}/${dbPlayers.length} (${updated} OK, ${skipped} skip)`);
          }

          await sleep(150);
          continue;
        }
      }

      skipped++;
    } catch (error) {
      skipped++;
    }
  }

  console.log(`   ✅ ${updated} joueurs mis à jour`);
  console.log(`   ⚠️  ${skipped} joueurs ignorés`);
}

// ============================================
// 3. INFIRMERIE - ESPN + MATCHING INTELLIGENT
// ============================================

async function fetchInjuryReport() {
  console.log("\n🏥 Récupération de l'infirmerie...");

  // Reset tous les joueurs
  await prisma.player.updateMany({
    data: {
      isInjured: false,
      injuryStatus: null,
      injuryNote: null,
      injuryReturnDate: null,
    },
  });

  let updated = 0;

  try {
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("ESPN injuries API failed");
    }

    const data = await response.json();

    if (!data.injuries || data.injuries.length === 0) {
      console.log("   ℹ️  Aucune blessure trouvée");
      return;
    }

    console.log(`   📋 ${data.injuries.length} blessures trouvées`);

    for (const injury of data.injuries) {
      if (!injury.athlete) continue;

      // Essayer de matcher par externalId
      let player = null;

      if (injury.athlete.id) {
        player = await prisma.player.findFirst({
          where: { externalId: injury.athlete.id.toString() },
        });
      }

      // Fallback: matcher par nom
      if (!player && injury.athlete.displayName) {
        const name = injury.athlete.displayName;
        player = await prisma.player.findFirst({
          where: {
            OR: [
              { fullName: { equals: name, mode: "insensitive" } },
              { fullName: { contains: name, mode: "insensitive" } },
            ],
          },
        });
      }

      if (!player) continue;

      const status = injury.status || "Out";
      const note = injury.details?.detail || injury.longComment || injury.type || "Injury";
      const returnDate = injury.details?.returnDate || null;

      await prisma.player.update({
        where: { id: player.id },
        data: {
          isInjured: true,
          injuryStatus: status,
          injuryNote: note,
          injuryReturnDate: returnDate ? new Date(returnDate) : null,
        },
      });

      updated++;
    }

    console.log(`   ✅ ${updated} joueurs blessés identifiés`);
  } catch (error) {
    console.log("   ❌ Erreur infirmerie:", error);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🏀 SCRIPT ULTIME NBA - API OFFICIELLE NBA.COM");
  console.log("📅 Saison 2025-2026 | 1er janvier 2026");
  console.log("=".repeat(60));

  try {
    // 1. Standings depuis NBA.com
    const standingsResult = await fetchStandingsFromNBA();

    if (!standingsResult.success) {
      console.log("⚠️  Échec récupération standings NBA.com");
    }

    // 2. Détails joueurs (ESPN pour les infos physiques)
    await fetchPlayerDetails();

    // 3. Infirmerie avec matching intelligent
    await fetchInjuryReport();

    console.log("\n" + "=".repeat(60));
    console.log("✅ SCRIPT TERMINÉ");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ ERREUR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
