/**
 * Script de développement pour récupérer TOUTES les stats NBA 2025-2026
 *
 * Ce script récupère :
 * - Injury report (blessés actuels)
 * - Standings (classement Est + Ouest)
 * - Team stats (stats complètes des 30 équipes)
 * - Player season stats (moyennes saison + DD2 + TD3 + +/-)
 * - Game boxscores (stats match par match)
 *
 * ATTENTION : ~600+ requêtes API, durée estimée : 10-15 minutes
 *
 * Usage: npx tsx prisma/fetch-nba-stats.ts
 */

import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const CURRENT_SEASON = "2025-2026";
// ESPN utilise l'année de fin, mais on va surtout utiliser les endpoints "current"
const ESPN_SEASON_YEAR = "2026";

// Délais pour éviter rate limiting
const DELAY_SHORT = 300; // 300ms entre requêtes légères
const DELAY_LONG = 500; // 500ms entre requêtes lourdes

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 1. INJURY REPORT
// ============================================

interface ESPNInjury {
  id: string;
  longComment: string;
  shortComment: string;
  status: string; // "Out", "Day-To-Day", "Questionable"
  date: string;
  athlete: {
    id: string;
    displayName: string;
  };
  team: {
    id: string;
    abbreviation: string;
  };
}

async function fetchInjuryReport() {
  console.log("\n📋 Récupération Injury Report...\n");

  try {
    const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Erreur API: ${response.status}`);
      return;
    }

    const data = await response.json();
    const injuries: ESPNInjury[] = data.injuries || [];

    console.log(`   ✅ ${injuries.length} blessures trouvées\n`);

    // Reset tous les joueurs à non blessés
    await prisma.player.updateMany({
      data: {
        isInjured: false,
        injuryStatus: null,
        injuryNote: null,
        injuryReturnDate: null,
      },
    });

    let updated = 0;

    // Update les joueurs blessés
    for (const injury of injuries) {
      // Skip si pas d'athlete (données incomplètes)
      if (!injury.athlete || !injury.athlete.id) {
        continue;
      }

      const player = await prisma.player.findUnique({
        where: { externalId: injury.athlete.id },
      });

      if (player) {
        await prisma.player.update({
          where: { id: player.id },
          data: {
            isInjured: true,
            injuryStatus: injury.status,
            injuryNote: injury.longComment || injury.shortComment,
            // Note: ESPN ne fournit pas toujours de date de retour
          },
        });

        console.log(`   🏥 ${injury.athlete.displayName} - ${injury.status} (${injury.shortComment})`);
        updated++;
      }
    }

    console.log(`\n   📊 ${updated} joueurs blessés mis à jour\n`);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'injury report:", error);
  }
}

// ============================================
// 2. STANDINGS (Classement)
// ============================================

interface ESPNStandingsTeam {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
  };
  stats: Array<{
    name: string;
    displayValue: string;
    value: number;
  }>;
}

async function fetchStandings() {
  console.log("\n🏆 Récupération Standings...\n");

  try {
    // Sans spécifier la saison = saison en cours
    const url = `http://site.api.espn.com/apis/v2/sports/basketball/nba/standings`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Erreur API: ${response.status}`);
      return;
    }

    const data = await response.json();

    // ESPN retourne standings par conférence
    const conferences = data.children || [];

    for (const conference of conferences) {
      const conferenceName = conference.name; // "Eastern Conference" ou "Western Conference"
      const standings: ESPNStandingsTeam[] = conference.standings?.entries || [];

      console.log(`\n   ${conferenceName}:\n`);

      for (let i = 0; i < standings.length; i++) {
        const entry = standings[i];
        const teamAbbr = entry.team.abbreviation;
        const stats = entry.stats;

        // Trouver les stats dans le tableau
        const wins = stats.find((s) => s.name === "wins")?.value || 0;
        const losses = stats.find((s) => s.name === "losses")?.value || 0;
        const winPct = stats.find((s) => s.name === "winPercent")?.value || 0;

        console.log(`   ${(i + 1).toString().padStart(2)}. ${teamAbbr.padEnd(4)} ${wins}-${losses} (${(winPct * 100).toFixed(1)}%)`);
      }
    }

    console.log("\n   ✅ Standings récupérés\n");
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des standings:", error);
  }
}

// ============================================
// 3. TEAM STATS (Stats des équipes)
// ============================================

async function fetchTeamStats() {
  console.log("\n📊 Récupération Team Stats (30 équipes)...\n");

  const teams = await prisma.team.findMany();

  let success = 0;
  let errors = 0;

  for (const team of teams) {
    try {
      // Utiliser l'endpoint sans spécifier la saison (récupère saison en cours)
      const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${team.externalId}/statistics`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`   ⚠️  ${team.abbreviation} - API error ${response.status}`);
        errors++;
        await sleep(DELAY_SHORT);
        continue;
      }

      const data = await response.json();
      const splits = data.splits?.categories || [];

      // Extraire les stats principales
      let wins = 0;
      let losses = 0;
      let ppg = 0;
      let oppPpg = 0;
      let fgPct = 0;
      let fg3Pct = 0;
      let ftPct = 0;
      let rpg = 0;
      let apg = 0;
      let spg = 0;
      let bpg = 0;
      let tpg = 0;

      // Parser les stats depuis ESPN (structure complexe)
      for (const category of splits) {
        const stats = category.stats || [];
        for (const stat of stats) {
          switch (stat.name) {
            case "wins":
              wins = stat.value;
              break;
            case "losses":
              losses = stat.value;
              break;
            case "avgPoints":
              ppg = stat.value;
              break;
            case "avgPointsAgainst":
              oppPpg = stat.value;
              break;
            case "fieldGoalPct":
              fgPct = stat.value;
              break;
            case "threePointFieldGoalPct":
              fg3Pct = stat.value;
              break;
            case "freeThrowPct":
              ftPct = stat.value;
              break;
            case "avgRebounds":
              rpg = stat.value;
              break;
            case "avgAssists":
              apg = stat.value;
              break;
            case "avgSteals":
              spg = stat.value;
              break;
            case "avgBlocks":
              bpg = stat.value;
              break;
            case "avgTurnovers":
              tpg = stat.value;
              break;
          }
        }
      }

      const winPct = wins + losses > 0 ? wins / (wins + losses) : 0;
      const differential = ppg - oppPpg;

      // Upsert dans TeamSeasonStats
      await prisma.teamSeasonStats.upsert({
        where: {
          teamId_season: {
            teamId: team.id,
            season: CURRENT_SEASON,
          },
        },
        create: {
          teamId: team.id,
          season: CURRENT_SEASON,
          wins,
          losses,
          winPct,
          pointsPerGame: ppg,
          pointsAllowedPerGame: oppPpg,
          pointDifferential: differential,
          fieldGoalPct: fgPct,
          threePointPct: fg3Pct,
          freeThrowPct: ftPct,
          reboundsPerGame: rpg,
          assistsPerGame: apg,
          stealsPerGame: spg,
          blocksPerGame: bpg,
          turnoversPerGame: tpg,
        },
        update: {
          wins,
          losses,
          winPct,
          pointsPerGame: ppg,
          pointsAllowedPerGame: oppPpg,
          pointDifferential: differential,
          fieldGoalPct: fgPct,
          threePointPct: fg3Pct,
          freeThrowPct: ftPct,
          reboundsPerGame: rpg,
          assistsPerGame: apg,
          stealsPerGame: spg,
          blocksPerGame: bpg,
          turnoversPerGame: tpg,
        },
      });

      console.log(`   ✅ ${team.abbreviation.padEnd(4)} - ${wins}-${losses} (${ppg.toFixed(1)} PPG)`);
      success++;
      await sleep(DELAY_LONG);
    } catch (error) {
      console.error(`   ❌ ${team.abbreviation} - Error:`, error);
      errors++;
    }
  }

  console.log(`\n   📊 ${success} équipes, ${errors} erreurs\n`);
}

// ============================================
// 4. PLAYER SEASON STATS
// ============================================

async function fetchPlayerSeasonStats() {
  console.log("\n📊 Récupération Player Season Stats (526 joueurs)...\n");
  console.log("   ⏳ Cela va prendre 5-10 minutes...\n");

  const players = await prisma.player.findMany({
    include: { team: true },
  });

  let success = 0;
  let errors = 0;
  let noData = 0;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    try {
      // Utiliser l'endpoint sans spécifier la saison (récupère saison en cours)
      const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${player.externalId}/statistics`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          // Joueur sans stats (probablement pas encore joué)
          noData++;
        } else {
          errors++;
        }
        await sleep(DELAY_SHORT);
        continue;
      }

      const data = await response.json();
      const splits = data.splits?.categories || [];

      // Extraire les stats
      let gp = 0;
      let pts = 0, reb = 0, ast = 0, stl = 0, blk = 0, tov = 0, min = 0;
      let fgm = 0, fga = 0, fg3m = 0, fg3a = 0, ftm = 0, fta = 0;
      let plusMinus = 0;

      for (const category of splits) {
        const stats = category.stats || [];
        for (const stat of stats) {
          switch (stat.name) {
            case "gamesPlayed":
              gp = stat.value;
              break;
            case "avgPoints":
              pts = stat.value;
              break;
            case "avgRebounds":
              reb = stat.value;
              break;
            case "avgAssists":
              ast = stat.value;
              break;
            case "avgSteals":
              stl = stat.value;
              break;
            case "avgBlocks":
              blk = stat.value;
              break;
            case "avgTurnovers":
              tov = stat.value;
              break;
            case "avgMinutes":
              min = stat.value;
              break;
            case "fieldGoalsMade":
              fgm = stat.value;
              break;
            case "fieldGoalsAttempted":
              fga = stat.value;
              break;
            case "threePointFieldGoalsMade":
              fg3m = stat.value;
              break;
            case "threePointFieldGoalsAttempted":
              fg3a = stat.value;
              break;
            case "freeThrowsMade":
              ftm = stat.value;
              break;
            case "freeThrowsAttempted":
              fta = stat.value;
              break;
            case "avgPlusMinus":
              plusMinus = Math.round(stat.value * gp); // Convertir moyenne en total
              break;
          }
        }
      }

      if (gp === 0) {
        noData++;
        await sleep(DELAY_SHORT);
        continue;
      }

      const fgPct = fga > 0 ? (fgm / fga) * 100 : 0;
      const fg3Pct = fg3a > 0 ? (fg3m / fg3a) * 100 : 0;
      const ftPct = fta > 0 ? (ftm / fta) * 100 : 0;

      // Calculer totaux
      const totalPts = Math.round(pts * gp);
      const totalReb = Math.round(reb * gp);
      const totalAst = Math.round(ast * gp);
      const totalStl = Math.round(stl * gp);
      const totalBlk = Math.round(blk * gp);
      const totalTov = Math.round(tov * gp);
      const totalMin = Math.round(min * gp);

      // Pour DD2 et TD3, on va les calculer plus tard depuis GamePlayerStats
      // Pour l'instant on met 0

      await prisma.playerSeasonStats.upsert({
        where: {
          playerId_season: {
            playerId: player.id,
            season: CURRENT_SEASON,
          },
        },
        create: {
          playerId: player.id,
          season: CURRENT_SEASON,
          gamesPlayed: gp,
          pointsPerGame: pts,
          reboundsPerGame: reb,
          assistsPerGame: ast,
          stealsPerGame: stl,
          blocksPerGame: blk,
          turnoversPerGame: tov,
          minutesPerGame: min,
          fieldGoalPct: fgPct,
          threePointPct: fg3Pct,
          freeThrowPct: ftPct,
          totalPoints: totalPts,
          totalRebounds: totalReb,
          totalAssists: totalAst,
          totalSteals: totalStl,
          totalBlocks: totalBlk,
          totalTurnovers: totalTov,
          totalMinutes: totalMin,
          plusMinus: plusMinus,
          doubleDoubles: 0, // À calculer plus tard
          tripleDoubles: 0, // À calculer plus tard
        },
        update: {
          gamesPlayed: gp,
          pointsPerGame: pts,
          reboundsPerGame: reb,
          assistsPerGame: ast,
          stealsPerGame: stl,
          blocksPerGame: blk,
          turnoversPerGame: tov,
          minutesPerGame: min,
          fieldGoalPct: fgPct,
          threePointPct: fg3Pct,
          freeThrowPct: ftPct,
          totalPoints: totalPts,
          totalRebounds: totalReb,
          totalAssists: totalAst,
          totalSteals: totalStl,
          totalBlocks: totalBlk,
          totalTurnovers: totalTov,
          totalMinutes: totalMin,
          plusMinus: plusMinus,
        },
      });

      const teamAbbr = player.team?.abbreviation || "FA";
      console.log(`   [${i + 1}/${players.length}] ✅ ${player.fullName.padEnd(25)} (${teamAbbr}) - ${gp} GP, ${pts.toFixed(1)} PPG`);
      success++;
      await sleep(DELAY_LONG);
    } catch (error) {
      console.error(`   [${i + 1}/${players.length}] ❌ ${player.fullName} - Error:`, error);
      errors++;
    }
  }

  console.log(`\n   📊 Résumé: ${success} joueurs avec stats, ${noData} sans stats, ${errors} erreurs\n`);
}

// ============================================
// 5. GAME BOXSCORES (Stats match par match)
// ============================================

async function fetchGameBoxscores() {
  console.log("\n📊 Récupération Game Boxscores...\n");
  console.log("   ⏳ Cela va prendre du temps...\n");

  // Récupérer tous les matchs FINAL de la saison
  const games = await prisma.game.findMany({
    where: {
      season: CURRENT_SEASON,
      status: "FINAL",
    },
    orderBy: { gameDate: "asc" },
  });

  console.log(`   📝 ${games.length} matchs terminés trouvés\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];

    try {
      const url = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${game.externalId}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`   [${i + 1}/${games.length}] ⚠️  Game ${game.externalId} - API error ${response.status}`);
        errors++;
        await sleep(DELAY_SHORT);
        continue;
      }

      const data = await response.json();
      const boxscore = data.boxscore;

      if (!boxscore || !boxscore.players) {
        console.log(`   [${i + 1}/${games.length}] ⚠️  Game ${game.externalId} - No boxscore`);
        await sleep(DELAY_SHORT);
        continue;
      }

      let statsCreated = 0;

      // Boxscore contient 2 équipes
      for (const teamBox of boxscore.players) {
        const teamStats = teamBox.statistics || [];

        for (const playerStat of teamStats) {
          const athlete = playerStat.athlete;
          const stats = playerStat.stats || [];

          // Trouver le joueur en DB
          const player = await prisma.player.findUnique({
            where: { externalId: athlete.id },
          });

          if (!player) continue;

          // Parser les stats (ESPN format: tableau de strings)
          const pts = parseInt(stats[0]) || 0;
          const fgm = parseInt(stats[1]?.split("-")[0]) || 0;
          const fga = parseInt(stats[1]?.split("-")[1]) || 0;
          const fg3m = parseInt(stats[2]?.split("-")[0]) || 0;
          const fg3a = parseInt(stats[2]?.split("-")[1]) || 0;
          const ftm = parseInt(stats[3]?.split("-")[0]) || 0;
          const fta = parseInt(stats[3]?.split("-")[1]) || 0;
          const reb = parseInt(stats[5]) || 0;
          const ast = parseInt(stats[6]) || 0;
          const stl = parseInt(stats[7]) || 0;
          const blk = parseInt(stats[8]) || 0;
          const tov = parseInt(stats[9]) || 0;
          const plusMinus = parseInt(stats[10]) || null;
          const min = stats[11] || "0:00";

          // Upsert dans GamePlayerStats
          await prisma.gamePlayerStats.upsert({
            where: {
              gameId_playerId: {
                gameId: game.id,
                playerId: player.id,
              },
            },
            create: {
              gameId: game.id,
              playerId: player.id,
              teamId: player.teamId!,
              points: pts,
              rebounds: reb,
              assists: ast,
              steals: stl,
              blocks: blk,
              turnovers: tov,
              minutes: min,
              fieldGoalsMade: fgm,
              fieldGoalsAttempted: fga,
              threePointersMade: fg3m,
              threePointersAttempted: fg3a,
              freeThrowsMade: ftm,
              freeThrowsAttempted: fta,
              plusMinus: plusMinus,
            },
            update: {
              points: pts,
              rebounds: reb,
              assists: ast,
              steals: stl,
              blocks: blk,
              turnovers: tov,
              minutes: min,
              fieldGoalsMade: fgm,
              fieldGoalsAttempted: fga,
              threePointersMade: fg3m,
              threePointersAttempted: fg3a,
              freeThrowsMade: ftm,
              freeThrowsAttempted: fta,
              plusMinus: plusMinus,
            },
          });

          statsCreated++;
        }
      }

      console.log(`   [${i + 1}/${games.length}] ✅ Game ${game.externalId} - ${statsCreated} player stats`);
      success++;
      await sleep(DELAY_LONG);
    } catch (error) {
      console.error(`   [${i + 1}/${games.length}] ❌ Game ${game.externalId} - Error:`, error);
      errors++;
    }
  }

  console.log(`\n   📊 ${success} matchs, ${errors} erreurs\n`);
}

// ============================================
// 6. CALCULER DD2 et TD3
// ============================================

async function calculateDoubleTripleDoubles() {
  console.log("\n🔢 Calcul des Double-Doubles et Triple-Doubles...\n");

  const players = await prisma.player.findMany({
    include: {
      gameStats: true,
      seasonStats: true,
    },
  });

  for (const player of players) {
    const seasonStat = player.seasonStats.find((s) => s.season === CURRENT_SEASON);
    if (!seasonStat) continue;

    let dd2 = 0;
    let td3 = 0;

    for (const gameStat of player.gameStats) {
      const categories = [
        gameStat.points,
        gameStat.rebounds || 0,
        gameStat.assists || 0,
        gameStat.steals || 0,
        gameStat.blocks || 0,
      ];

      const doubleDigits = categories.filter((v) => v >= 10).length;

      if (doubleDigits >= 2) dd2++;
      if (doubleDigits >= 3) td3++;
    }

    await prisma.playerSeasonStats.update({
      where: { id: seasonStat.id },
      data: {
        doubleDoubles: dd2,
        tripleDoubles: td3,
      },
    });

    if (dd2 > 0 || td3 > 0) {
      console.log(`   ✅ ${player.fullName.padEnd(25)} - DD2: ${dd2}, TD3: ${td3}`);
    }
  }

  console.log("\n   ✅ Calcul terminé\n");
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🏀 Récupération complète des stats NBA 2025-2026\n");
  console.log("=" .repeat(60));
  console.log("⚠️  Ce script va faire ~600+ requêtes API");
  console.log("⏱️  Durée estimée : 10-15 minutes");
  console.log("=" .repeat(60));

  // 1. Injury Report (~1 requête)
  await fetchInjuryReport();
  await sleep(1000);

  // 2. Standings (~1 requête)
  await fetchStandings();
  await sleep(1000);

  // 3. Team Stats (~30 requêtes)
  await fetchTeamStats();
  await sleep(1000);

  // 4. Player Season Stats (~526 requêtes)
  await fetchPlayerSeasonStats();
  await sleep(1000);

  // 5. Game Boxscores (variable selon nombre de matchs)
  await fetchGameBoxscores();
  await sleep(1000);

  // 6. Calculer DD2 et TD3
  await calculateDoubleTripleDoubles();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Script terminé !");
  console.log("=".repeat(60) + "\n");
  console.log("📊 Données disponibles :");
  console.log("   - Injury Report (/joueurs/infirmerie)");
  console.log("   - Standings (/classement)");
  console.log("   - Team Stats (/equipes)");
  console.log("   - Player Stats (/joueurs, /statistiques)");
  console.log("   - Game Boxscores (stats match par match)");
  console.log("\n🎯 Prêt pour créer les pages !\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
