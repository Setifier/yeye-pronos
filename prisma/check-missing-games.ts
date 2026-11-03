/**
 * Script: Check which games are missing from standings
 *
 * For each team with GP < 82, shows:
 *  - Which specific games (SCHEDULED/POSTPONED) are not counted
 *  - Whether those games have been rescheduled (new externalId in DB with FINAL status)
 *  - The date gaps in GamePlayerStats (days with no player stats = potentially unseeded periods)
 *
 * Usage: npm run db:check-missing
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const season    = seasonArg ?? getCurrentSeason();

  console.log(`\n🔍 Missing Games Check — Season ${season}\n`);
  console.log("=".repeat(60));

  const teams = await prisma.team.findMany({
    select: { id: true, abbreviation: true },
    orderBy: { abbreviation: "asc" },
  });

  // Count GP per team
  const teamGP = new Map<string, number>();
  const finalGames = await prisma.game.findMany({
    where: { season, seasonType: "Regular Season", status: "FINAL", winnerId: { not: null } },
    select: { homeTeamId: true, awayTeamId: true },
  });
  for (const t of teams) teamGP.set(t.id, 0);
  for (const g of finalGames) {
    teamGP.set(g.homeTeamId, (teamGP.get(g.homeTeamId) ?? 0) + 1);
    teamGP.set(g.awayTeamId, (teamGP.get(g.awayTeamId) ?? 0) + 1);
  }

  const underTeams = teams.filter((t) => (teamGP.get(t.id) ?? 0) < 82);

  if (underTeams.length === 0) {
    console.log("\n✅ All teams have 82+ GP.\n");
    return;
  }

  console.log(`\n⚠️  Teams with < 82 GP: ${underTeams.map((t) => `${t.abbreviation} (${teamGP.get(t.id)})`).join(", ")}\n`);

  // For each under-count team, find their non-FINAL games
  for (const team of underTeams) {
    const missing = 82 - (teamGP.get(team.id) ?? 0);
    console.log(`\n─── ${team.abbreviation} (missing ${missing} game${missing > 1 ? "s" : ""}) ───`);

    const nonFinal = await prisma.game.findMany({
      where: {
        season,
        seasonType: "Regular Season",
        status: { not: "FINAL" },
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: {
        homeTeam: { select: { abbreviation: true } },
        awayTeam: { select: { abbreviation: true } },
      },
      orderBy: { gameDate: "asc" },
    });

    for (const g of nonFinal) {
      const opp = g.homeTeamId === team.id ? g.awayTeam.abbreviation : g.homeTeam.abbreviation;
      const home = g.homeTeamId === team.id;

      // Check if a different game between same two teams exists as FINAL around same period
      const sameMatchup = await prisma.game.findMany({
        where: {
          season,
          seasonType: "Regular Season",
          status: "FINAL",
          winnerId: { not: null },
          OR: [
            { homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId },
            { homeTeamId: g.awayTeamId, awayTeamId: g.homeTeamId },
          ],
          gameDate: {
            gte: new Date(g.gameDate.getTime() - 30 * 24 * 60 * 60 * 1000), // ±30 days
            lte: new Date(g.gameDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          NOT: { id: g.id },
        },
        include: {
          homeTeam: { select: { abbreviation: true } },
          awayTeam: { select: { abbreviation: true } },
        },
      });

      const possibleReschedule = sameMatchup.length > 0
        ? ` → possible reschedule: ${sameMatchup.map((s) => `${s.homeTeam.abbreviation} ${s.homeScore}-${s.awayScore} ${s.awayTeam.abbreviation} (${s.gameDate.toISOString().slice(0, 10)})`).join(", ")}`
        : " → no rescheduled game found";

      console.log(
        `  ${g.gameDate.toISOString().slice(0, 10)}  ${home ? "vs" : "@"} ${opp}  [${g.status}]  ext:${g.externalId}${possibleReschedule}`
      );
    }
  }

  // ── Check for unseeded date gaps ──────────────────────────────
  console.log(`\n\n📅 Checking for date gaps in GamePlayerStats...\n`);

  // Find all dates that DO have player stats for regular season
  const statsWithDates = await prisma.gamePlayerStats.findMany({
    where: {
      game: { season, seasonType: "Regular Season" },
    },
    select: { game: { select: { gameDate: true } } },
    distinct: ["gameId"],
  });

  const datesWithStats = new Set(
    statsWithDates.map((s) => s.game.gameDate.toISOString().slice(0, 10))
  );

  // Find all dates that have SCHEDULED/LIVE/POSTPONED games in the past
  const missingGames = await prisma.game.findMany({
    where: {
      season,
      seasonType: "Regular Season",
      status: { notIn: ["FINAL", "CANCELLED"] },
      gameDate: { lt: new Date() },
    },
    include: {
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
    orderBy: { gameDate: "asc" },
  });

  console.log(`  Non-FINAL past games (${missingGames.length} total):\n`);
  for (const g of missingGames) {
    const date = g.gameDate.toISOString().slice(0, 10);
    const hasStatsOnDate = datesWithStats.has(date);
    const hasStatsForGame = await prisma.gamePlayerStats.count({ where: { gameId: g.id } });
    console.log(
      `  ${date}  ${g.homeTeam.abbreviation} vs ${g.awayTeam.abbreviation}  [${g.status}]` +
      `  stats for game: ${hasStatsForGame}  stats exist on that date: ${hasStatsOnDate ? "yes" : "NO ← date gap"}`
    );
  }

  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
