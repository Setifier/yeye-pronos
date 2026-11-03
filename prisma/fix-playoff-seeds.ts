/**
 * Script: Fix PlayoffSeries playoff seeds (team1Seed / team2Seed)
 *
 * Uses a matchup-inference algorithm that correctly handles Play-In results:
 *   1. Sort the 8 R1 playoff teams per conference by regular-season win%
 *      (with conf-record tiebreaker) → identifies the top-4 "base" seeds (1-4)
 *   2. For each base seed, the R1 opponent is the "complement" seed:
 *        seed-1's partner → seed 8
 *        seed-2's partner → seed 7
 *        seed-3's partner → seed 6
 *        seed-4's partner → seed 5
 *   This correctly assigns Play-In winners (e.g. a 9th regular-season team
 *   that won Play-In and is now the 7-seed in the bracket).
 *
 * Usage:
 *   npm run db:fix-playoff-seeds
 *   npm run db:fix-playoff-seeds -- --season=2025-26 --dry-run
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

function parseRecord(record: string | null | undefined) {
  if (!record) return { wins: 0, losses: 0 };
  const [w, l] = record.split("-").map(Number);
  return { wins: w ?? 0, losses: l ?? 0 };
}

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");
  const season    = seasonArg ?? getCurrentSeason();

  console.log(`\n🏀 Fix Playoff Seeds — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  // ── Fetch all R1 series ───────────────────────────────────────
  const r1Series = await prisma.playoffSeries.findMany({
    where: { season, round: 1 },
    include: {
      team1: { select: { id: true, abbreviation: true, conference: true } },
      team2: { select: { id: true, abbreviation: true, conference: true } },
    },
  });

  if (r1Series.length === 0) {
    console.log("  ⚠️  No round-1 series found for this season.");
    return;
  }

  // ── Fetch regular-season stats for all R1 teams ───────────────
  const allTeamIds = r1Series.flatMap((s) => [s.team1Id, s.team2Id]);
  const stats = await prisma.teamSeasonStats.findMany({
    where: { season, teamId: { in: allTeamIds } },
    select: { teamId: true, winPct: true, wins: true, conferenceRecord: true, pointDifferential: true },
  });
  const statsMap = new Map(stats.map((s) => [s.teamId, s]));

  // ── Group R1 series by conference ─────────────────────────────
  const byConf: Record<string, typeof r1Series> = {};
  for (const s of r1Series) {
    const conf = s.conference ?? s.team1.conference ?? "UNKNOWN";
    if (!byConf[conf]) byConf[conf] = [];
    byConf[conf].push(s);
  }

  let updated = 0;

  for (const [conf, seriesList] of Object.entries(byConf)) {
    console.log(`\n  📋 Conference: ${conf}`);

    // Collect all 8 teams in this bracket half
    const confTeams = Array.from(
      new Set(seriesList.flatMap((s) => [s.team1Id, s.team2Id]))
    ).map((id) => ({
      id,
      stats: statsMap.get(id),
    }));

    if (confTeams.length !== 8) {
      console.log(`     ⚠️  Expected 8 teams, got ${confTeams.length} — skipping`);
      continue;
    }

    // Sort by win%, then conference record wins, then point differential
    const sorted = [...confTeams].sort((a, b) => {
      const aWinPct = a.stats?.winPct ?? 0;
      const bWinPct = b.stats?.winPct ?? 0;
      if (Math.abs(bWinPct - aWinPct) > 1e-6) return bWinPct - aWinPct;

      const aConf = parseRecord(a.stats?.conferenceRecord).wins;
      const bConf = parseRecord(b.stats?.conferenceRecord).wins;
      if (bConf !== aConf) return bConf - aConf;

      return (b.stats?.pointDifferential ?? 0) - (a.stats?.pointDifferential ?? 0);
    });

    // Top 4 are "base" seeds 1-4
    const baseSeed: Record<string, number> = {};
    sorted.slice(0, 4).forEach((t, i) => { baseSeed[t.id] = i + 1; });

    console.log(`     Base seeds 1-4:`);
    sorted.slice(0, 4).forEach((t, i) => {
      const abbr = seriesList
        .flatMap((s) => [s.team1, s.team2])
        .find((tm) => tm.id === t.id)?.abbreviation ?? t.id;
      console.log(`       ${i + 1}. ${abbr} (winPct=${((t.stats?.winPct ?? 0) * 100).toFixed(1)}%)`);
    });

    // Build a map: teamId → the partner teamId in their R1 matchup
    const partner: Record<string, string> = {};
    for (const s of seriesList) {
      partner[s.team1Id] = s.team2Id;
      partner[s.team2Id] = s.team1Id;
    }

    // Assign complement seeds
    // seed-1 partner → 8, seed-2 → 7, seed-3 → 6, seed-4 → 5
    const complement: Record<number, number> = { 1: 8, 2: 7, 3: 6, 4: 5 };
    const seedMap: Record<string, number> = { ...baseSeed };
    for (const [teamId, seed] of Object.entries(baseSeed)) {
      const partnerId = partner[teamId];
      if (partnerId) {
        seedMap[partnerId] = complement[seed]!;
      }
    }

    console.log(`\n     Final seeds:`);
    for (const s of seriesList) {
      const abbr = (t: { abbreviation: string }) => t.abbreviation;
      const s1 = seedMap[s.team1Id] ?? null;
      const s2 = seedMap[s.team2Id] ?? null;
      console.log(
        `       ${abbr(s.team1)} (${s1 ?? "?"}) vs ${abbr(s.team2)} (${s2 ?? "?"})` +
        (s.team1Seed !== null || s.team2Seed !== null
          ? `  [was: ${s.team1Seed ?? "?"} vs ${s.team2Seed ?? "?"}]`
          : "")
      );

      if (!dryRun && (s.team1Seed !== s1 || s.team2Seed !== s2)) {
        await prisma.playoffSeries.update({
          where: { id: s.id },
          data:  { team1Seed: s1, team2Seed: s2, updatedAt: new Date() },
        });
        updated++;
      }
    }
  }

  console.log(`\n✅ Done${dryRun ? " (dry run)" : ""}: ${updated} series updated with correct playoff seeds.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
