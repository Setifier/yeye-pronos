/**
 * Script: Fix missing round/conference on PlayoffSeries
 *
 * For each series where round or conference is null, picks the first game,
 * fetches its ESPN event data, and extracts the round/conference from the notes.
 * This is a one-time fix for series seeded before ESPN notes were available.
 *
 * Usage:
 *   npm run db:fix-playoff-rounds                     → current season
 *   npm run db:fix-playoff-rounds -- --season=2025-26
 *   npm run db:fix-playoff-rounds -- --dry-run
 */

import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

function parseRoundFromNote(
  headline: string
): { round: number; conference: string } | null {
  const h = headline.toLowerCase();

  let round = 0;
  if (h.includes("first round")) round = 1;
  else if (
    h.includes("second round") ||
    h.includes("conference semifinals") ||
    h.includes("semifinals")
  )
    round = 2;
  else if (h.includes("conference finals") && !h.includes("nba finals")) round = 3;
  else if (h.includes("nba finals") || h.includes("championship series")) round = 4;
  else return null;

  let conference = "Finals";
  if (h.includes("eastern") || h.includes("east")) conference = "East";
  else if (h.includes("western") || h.includes("west")) conference = "West";

  return { round, conference };
}

async function fetchGameNotes(
  espnId: string
): Promise<{ round: number; conference: string } | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes: any[] =
      data?.header?.competitions?.[0]?.notes ?? [];
    for (const note of notes) {
      const parsed = parseRoundFromNote(note.headline ?? "");
      if (parsed) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const dryRun    = args.includes("--dry-run");
  const season    = seasonArg ?? getCurrentSeason();

  console.log(`\n🔧 Fix Playoff Rounds — Season ${season}${dryRun ? " [DRY RUN]" : ""}\n`);
  console.log("=".repeat(60));

  const needsFix = await prisma.playoffSeries.findMany({
    where: {
      season,
      OR: [{ round: null }, { conference: null }],
    },
    include: {
      team1: { select: { abbreviation: true } },
      team2: { select: { abbreviation: true } },
      games: {
        where:   { status: { not: "CANCELLED" } },
        orderBy: { gameDate: "asc" },
        select:  { id: true, externalId: true },
        take:    1,
      },
    },
  });

  console.log(`  Found ${needsFix.length} series without complete round/conference info.\n`);

  if (needsFix.length === 0) {
    console.log("✅ All series already have round and conference set.\n");
    return;
  }

  let fixed  = 0;
  let failed = 0;

  for (const series of needsFix) {
    const tag  = `${series.team1.abbreviation} vs ${series.team2.abbreviation}`;
    const game = series.games[0];

    if (!game) {
      console.log(`  ⚠️  ${tag}: no games found — skipping`);
      failed++;
      continue;
    }

    process.stdout.write(`  🔍 ${tag} (ext:${game.externalId})... `);
    const result = await fetchGameNotes(game.externalId);
    await new Promise((r) => setTimeout(r, 350)); // polite rate limit

    if (result) {
      console.log(`Round ${result.round}, ${result.conference}`);
      if (!dryRun) {
        await prisma.playoffSeries.update({
          where: { id: series.id },
          data:  { round: result.round, conference: result.conference },
        });
      }
      fixed++;
    } else {
      console.log(`❌ No round info in ESPN notes`);
      failed++;
    }
  }

  console.log(
    `\n✅ ${dryRun ? "Would fix" : "Fixed"} ${fixed}/${needsFix.length} series` +
    (failed > 0 ? ` (${failed} could not be resolved)` : "") +
    ".\n"
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
