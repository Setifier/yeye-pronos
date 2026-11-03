import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.teamSeasonStats.findFirst({
    where: { season: "2025-2026" },
    include: { team: true }
  });

  if (!sample) {
    console.log("No data found!");
    return;
  }

  console.log("\n=== SAMPLE TEAM DATA ===");
  console.log("Team:", sample.team.city, sample.team.name);
  console.log("\nRecord:");
  console.log("  Wins:", sample.wins);
  console.log("  Losses:", sample.losses);
  console.log("  Win%:", sample.winPct);
  console.log("\nRanks:");
  console.log("  Conference Rank:", sample.conferenceRank);
  console.log("  Division Rank:", sample.divisionRank);
  console.log("\nRecords:");
  console.log("  Home Record:", sample.homeRecord);
  console.log("  Away Record:", sample.awayRecord);
  console.log("  Current Streak:", sample.currentStreak);
  console.log("\nOffensive Stats:");
  console.log("  PPG:", sample.pointsPerGame);
  console.log("  Opp PPG:", sample.pointsAllowedPerGame);
  console.log("  Point Diff:", sample.pointDifferential);
  console.log("\nShooting:");
  console.log("  FG%:", sample.fieldGoalPct);
  console.log("  3P%:", sample.threePointPct);
  console.log("  FT%:", sample.freeThrowPct);
  console.log("\nOther:");
  console.log("  Rebounds/G:", sample.reboundsPerGame);
  console.log("  Assists/G:", sample.assistsPerGame);
  console.log("  Steals/G:", sample.stealsPerGame);
  console.log("  Blocks/G:", sample.blocksPerGame);
  console.log("  Turnovers/G:", sample.turnoversPerGame);

  await prisma.$disconnect();
}

main();
