/**
 * Script: Import final season standings directly from ESPN standings API
 *
 * Fetches the complete final standings (W/L, records, streaks, last 10, etc.)
 * directly from ESPN and writes them into TeamSeasonStats — no game-by-game
 * calculation, no boxscore dependency.
 *
 * Perfect for end-of-season archival: one fetch, clean data, done.
 *
 * Usage:
 *   npm run db:import-standings                    → current season
 *   npm run db:import-standings -- --season=2025-26
 *   npm run db:import-standings -- --dry-run        → preview only
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

// ESPN season year = the year the season ENDS
// 2025-26 season → ESPN year = 2026
function getESPNYear(season: string): number {
  const parts = season.split("-");
  if (parts.length === 2) {
    const second = parts[1];
    if (second.length === 2) {
      // "2025-26" → "20" + "26" = 2026
      return parseInt(parts[0].slice(0, 2) + second);
    }
    return parseInt(second);
  }
  return new Date().getFullYear();
}

// Also try with start year convention (some ESPN endpoints use start year)
function getESPNYearAlt(season: string): number {
  return parseInt(season.split("-")[0]);
}

function getStat(
  stats: Array<{ name: string; value?: number; displayValue?: string }>,
  name: string
): number | null {
  const s = stats.find((x) => x.name === name);
  return s?.value != null ? s.value : null;
}

function getStatDisplay(
  stats: Array<{ name: string; value?: number; displayValue?: string }>,
  name: string
): string | null {
  const s = stats.find((x) => x.name === name);
  return s?.displayValue ?? null;
}

async function fetchStandingsFromESPN(espnYear: number) {
  // seasontype=2 = regular season only
  const url = `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${espnYear}&seasontype=2`;
  console.log(`  📡 Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN standings API returned ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  // Print the season info ESPN says it's returning
  const seasonLabel = data?.season?.year ?? data?.season ?? "unknown";
  const seasonSlug  = data?.season?.slug ?? data?.name ?? "";
  console.log(`  📅 ESPN says this is season: ${seasonLabel} ${seasonSlug}`);

  return data;
}

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");
  const season    = seasonArg ?? getCurrentSeason();
  const espnYear    = getESPNYear(season);
  const espnYearAlt = getESPNYearAlt(season);

  console.log(`\n🏆 Import Final Standings — Season ${season} (ESPN year: ${espnYear}, alt: ${espnYearAlt})${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  // ── 1. Fetch all teams from DB ───────────────────────────────
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbreviation: true, externalId: true },
  });
  const teamByAbbr     = new Map(dbTeams.map((t) => [t.abbreviation, t]));
  const teamByExternal = new Map(dbTeams.map((t) => [t.externalId, t]));

  // ESPN standings API uses different abbreviations than the scoreboard API.
  // Map ESPN abbr → our DB abbr.
  const ESPN_ABBR: Record<string, string> = {
    NY:   "NYK",
    SA:   "SAS",
    GS:   "GSW",
    WSH:  "WAS",
    NO:   "NOP",
    UTAH: "UTA",
  };
  function normAbbr(raw: string): string {
    const up = raw.toUpperCase();
    return ESPN_ABBR[up] ?? up;
  }

  // ── 2. Fetch standings from ESPN ─────────────────────────────
  let espnData;
  try {
    espnData = await fetchStandingsFromESPN(espnYear);
  } catch (err) {
    console.error(`\n❌ Failed to fetch ESPN standings: ${err}`);
    process.exit(1);
  }

  // ESPN standings structure: data.children[] → each conference
  // each conference has .standings.entries[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conferences: any[] = espnData?.children ?? [];
  if (conferences.length === 0) {
    console.error("❌ No conference data in ESPN response.");
    console.log("Raw response:", JSON.stringify(espnData, null, 2).slice(0, 500));
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEntries: any[] = [];
  for (const conf of conferences) {
    const entries = conf?.standings?.entries ?? conf?.children?.flatMap(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (div: any) => div?.standings?.entries ?? []
    ) ?? [];
    allEntries.push(...entries);
  }

  const debugMode = args.includes("--debug");

  console.log(`\n  Found ${allEntries.length} team entries in ESPN response.\n`);

  if (allEntries.length === 0) {
    console.error("❌ No team entries found. ESPN response structure might have changed.");
    process.exit(1);
  }

  // Debug: print all stat names + values for the first team
  if (debugMode && allEntries[0]) {
    const firstTeam = allEntries[0];
    console.log(`\n  🔬 DEBUG — All stats for ${firstTeam.team?.abbreviation}:\n`);
    for (const s of (firstTeam.stats ?? [])) {
      console.log(`     ${String(s.name).padEnd(30)} value: ${String(s.value ?? "—").padEnd(12)} display: ${s.displayValue ?? "—"}`);
    }
    console.log();
  }

  // ── 3. Map + preview ─────────────────────────────────────────
  type TeamRow = {
    teamId:               string;
    abbreviation:         string;
    wins:                 number;
    losses:               number;
    winPct:               number;
    pointsPerGame:        number;
    pointsAllowedPerGame: number;
    pointDifferential:    number;
    homeRecord:           string | null;
    awayRecord:           string | null;
    conferenceRecord:     string | null;
    divisionRecord:       string | null;
    last10Record:         string | null;
    currentStreak:        string | null;
    fieldGoalPct:         number | null;
    threePointPct:        number | null;
    freeThrowPct:         number | null;
    reboundsPerGame:      number | null;
    assistsPerGame:       number | null;
    stealsPerGame:        number | null;
    blocksPerGame:        number | null;
    turnoversPerGame:     number | null;
  };

  const rows: TeamRow[] = [];
  const skipped: string[] = [];

  // Debug: show all ESPN team IDs + abbreviations vs our DB
  if (debugMode) {
    console.log("\n  🔬 ESPN teams vs DB teams:\n");
    for (const entry of allEntries) {
      const e = entry.team;
      if (!e) continue;
      const normalized = normAbbr(e.abbreviation ?? "");
      const matched    = teamByAbbr.get(normalized);
      const flag = !matched ? " ❌ NOT FOUND" : normalized !== (e.abbreviation ?? "").toUpperCase() ? ` (normalised ${e.abbreviation} → ${normalized})` : "";
      console.log(
        `     ESPN id:${String(e.id).padEnd(6)} abbr:${String(e.abbreviation).padEnd(5)} → ${normalized.padEnd(4)} → DB: ${matched?.abbreviation ?? "—"}${flag}`
      );
    }
    console.log();
  }

  for (const entry of allEntries) {
    const espnTeam = entry.team;
    if (!espnTeam) continue;

    // Match by normalised abbreviation ONLY — externalId is unreliable
    // across ESPN API endpoints (standings uses different numeric IDs)
    const abbr   = normAbbr(espnTeam.abbreviation ?? "");
    const dbTeam = teamByAbbr.get(abbr);

    if (!dbTeam) {
      skipped.push(espnTeam.abbreviation ?? espnTeam.id);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: Array<{ name: string; value?: number; displayValue?: string }> =
      entry.stats ?? [];

    // Exact stat names as returned by ESPN standings API (verified from debug output)
    const wins   = Math.round(getStat(stats, "wins")   ?? 0);
    const losses = Math.round(getStat(stats, "losses") ?? 0);
    const gp     = wins + losses;

    // Points per game (ESPN returns per-game averages here)
    const ppg  = getStat(stats, "avgPointsFor")     ?? 0;
    const oppg = getStat(stats, "avgPointsAgainst") ?? 0;
    const diff = getStat(stats, "differential")     ?? parseFloat((ppg - oppg).toFixed(1));

    // Records — ESPN uses exact capitalized names as stat keys
    const homeRecord = getStatDisplay(stats, "Home");           // "31-9"
    const awayRecord = getStatDisplay(stats, "Road");           // "28-13"
    const confRecord = getStatDisplay(stats, "vs. Conf.");      // "39-13"
    const divRecord  = getStatDisplay(stats, "vs. Div.");       // "12-4"
    const last10     = getStatDisplay(stats, "Last Ten Games"); // "8-2"
    const streak     = getStatDisplay(stats, "streak");         // "W3"

    // Shooting / per-game stats not in standings API → null
    const fgPct = null;
    const tpPct = null;
    const ftPct = null;
    const toAvg = (_v: number | null) => null;

    rows.push({
      teamId:               dbTeam.id,
      abbreviation:         dbTeam.abbreviation,
      wins,
      losses,
      winPct:               gp > 0 ? wins / gp : 0,
      pointsPerGame:        parseFloat(ppg.toFixed(1)),
      pointsAllowedPerGame: parseFloat(oppg.toFixed(1)),
      pointDifferential:    parseFloat(String(diff).replace("+", "")),
      homeRecord,
      awayRecord,
      conferenceRecord:     confRecord,
      divisionRecord:       divRecord,
      last10Record:         last10,
      currentStreak:        streak,
      fieldGoalPct:         fgPct,
      threePointPct:        tpPct,
      freeThrowPct:         ftPct,
      reboundsPerGame:      toAvg(null),
      assistsPerGame:       toAvg(null),
      stealsPerGame:        toAvg(null),
      blocksPerGame:        toAvg(null),
      turnoversPerGame:     toAvg(null),
    });
  }

  if (skipped.length > 0) {
    console.log(`  ⚠️  Teams not matched in DB: ${skipped.join(", ")}`);
  }

  // ── 4. Print preview ─────────────────────────────────────────
  console.log(`  Preview (${rows.length} teams):\n`);
  const sorted = [...rows].sort((a, b) => b.winPct - a.winPct);
  for (const r of sorted) {
    const gp = r.wins + r.losses;
    const flag = gp !== 82 ? `  ← ⚠️  ${gp} GP` : "";
    console.log(
      `  ${r.abbreviation.padEnd(4)} ${String(r.wins).padStart(2)}-${String(r.losses).padEnd(2)}` +
      `  L10: ${(r.last10Record ?? "?").padEnd(4)}` +
      `  Str: ${(r.currentStreak ?? "?").padEnd(4)}` +
      `  Home: ${(r.homeRecord ?? "?").padEnd(5)}` +
      `  Away: ${(r.awayRecord ?? "?")}${flag}`
    );
  }

  if (dryRun) {
    console.log("\n⚠️  Dry run — no writes performed.\n");
    return;
  }

  // ── 5. Upsert into DB ────────────────────────────────────────
  console.log(`\n\n💾 Writing to DB...\n`);
  let written = 0;

  for (const r of rows) {
    await prisma.teamSeasonStats.upsert({
      where:  { teamId_season: { teamId: r.teamId, season } },
      update: {
        wins:                 r.wins,
        losses:               r.losses,
        winPct:               r.winPct,
        pointsPerGame:        r.pointsPerGame,
        pointsAllowedPerGame: r.pointsAllowedPerGame,
        pointDifferential:    r.pointDifferential,
        homeRecord:           r.homeRecord,
        awayRecord:           r.awayRecord,
        conferenceRecord:     r.conferenceRecord,
        divisionRecord:       r.divisionRecord,
        last10Record:         r.last10Record,
        currentStreak:        r.currentStreak,
        fieldGoalPct:         r.fieldGoalPct,
        threePointPct:        r.threePointPct,
        freeThrowPct:         r.freeThrowPct,
        reboundsPerGame:      r.reboundsPerGame,
        assistsPerGame:       r.assistsPerGame,
        stealsPerGame:        r.stealsPerGame,
        blocksPerGame:        r.blocksPerGame,
        turnoversPerGame:     r.turnoversPerGame,
      },
      create: {
        teamId:               r.teamId,
        season,
        wins:                 r.wins,
        losses:               r.losses,
        winPct:               r.winPct,
        pointsPerGame:        r.pointsPerGame,
        pointsAllowedPerGame: r.pointsAllowedPerGame,
        pointDifferential:    r.pointDifferential,
        homeRecord:           r.homeRecord,
        awayRecord:           r.awayRecord,
        conferenceRecord:     r.conferenceRecord,
        divisionRecord:       r.divisionRecord,
        last10Record:         r.last10Record,
        currentStreak:        r.currentStreak,
        fieldGoalPct:         r.fieldGoalPct,
        threePointPct:        r.threePointPct,
        freeThrowPct:         r.freeThrowPct,
        reboundsPerGame:      r.reboundsPerGame,
        assistsPerGame:       r.assistsPerGame,
        stealsPerGame:        r.stealsPerGame,
        blocksPerGame:        r.blocksPerGame,
        turnoversPerGame:     r.turnoversPerGame,
      },
    });
    process.stdout.write(`  ✅ ${r.abbreviation} ${r.wins}-${r.losses}\n`);
    written++;
  }

  console.log(`\n✅ Done. ${written} teams updated in DB.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
