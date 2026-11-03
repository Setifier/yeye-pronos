/**
 * Playoff Series Tracking
 *
 * Handles creation and updates of PlayoffSeries records based on game results.
 * Called by:
 *  - seed-espn.ts  (bulk seeding)
 *  - morning-update CRON (after each FINAL playoff game)
 */

import { PrismaClient } from "@/generated/prisma";

// ─────────────────────────────────────────────
// Series key helpers
// ─────────────────────────────────────────────

/**
 * Build a canonical, stable series key from two team abbreviations.
 * Always sorted alphabetically so key is the same regardless of home/away.
 * e.g. ("2025-26", "NYK", "BOS") → "2025-26-BOS-NYK"
 */
export function buildSeriesKey(season: string, abbr1: string, abbr2: string): string {
  const [a, b] = [abbr1, abbr2].sort();
  return `${season}-${a}-${b}`;
}

// ─────────────────────────────────────────────
// Get or create a series
// ─────────────────────────────────────────────

/**
 * Upsert a PlayoffSeries for a given pair of teams in the given season.
 * Returns the series id.
 *
 * Round and conference are updated if they weren't set before (ESPN notes
 * are sometimes absent on the first game fetch and present later).
 */
export async function getOrCreateSeries(
  prisma: PrismaClient,
  season: string,
  homeTeamId: string,
  awayTeamId: string,
  homeAbbr: string,
  awayAbbr: string,
  round?: number | null,
  conference?: string | null
): Promise<string> {
  // Canonical ordering: alphabetically by abbreviation
  const [canonAbbr1, canonAbbr2] = [homeAbbr, awayAbbr].sort();
  const canonTeam1Id = canonAbbr1 === homeAbbr ? homeTeamId : awayTeamId;
  const canonTeam2Id = canonAbbr1 === homeAbbr ? awayTeamId : homeTeamId;
  const seriesKey = `${season}-${canonAbbr1}-${canonAbbr2}`;

  const existing = await prisma.playoffSeries.findUnique({ where: { seriesKey } });

  if (existing) {
    // Update round/conference if ESPN now provides them and we didn't have them
    if ((round && !existing.round) || (conference && !existing.conference)) {
      await prisma.playoffSeries.update({
        where: { id: existing.id },
        data: {
          round:      round      ?? existing.round      ?? null,
          conference: conference ?? existing.conference ?? null,
          updatedAt:  new Date(),
        },
      });
    }
    return existing.id;
  }

  const created = await prisma.playoffSeries.create({
    data: {
      season,
      seriesKey,
      round:      round      ?? null,
      conference: conference ?? null,
      team1Id:    canonTeam1Id,
      team2Id:    canonTeam2Id,
      team1Wins:  0,
      team2Wins:  0,
      status:     "ACTIVE",
    },
  });

  return created.id;
}

// ─────────────────────────────────────────────
// Update series after a game is FINAL
// ─────────────────────────────────────────────

/**
 * Recount wins for the series containing this game and update the record.
 * Returns the series id if the series is now complete (4 wins), else null.
 */
export async function updateSeriesAfterGame(
  gameId: string,
  prisma: PrismaClient
): Promise<string | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      seriesId: true,
      status:   true,
      winnerId: true,
      series: {
        select: { id: true, team1Id: true, team2Id: true },
      },
    },
  });

  if (!game?.seriesId || !game.series || game.status !== "FINAL" || !game.winnerId) {
    return null;
  }

  const { series } = game;

  // Recount wins from all FINAL games in this series (safer than incrementing)
  const seriesGames = await prisma.game.findMany({
    where:  { seriesId: series.id, status: "FINAL" },
    select: { winnerId: true },
  });

  let team1Wins = 0;
  let team2Wins = 0;
  for (const g of seriesGames) {
    if (g.winnerId === series.team1Id) team1Wins++;
    else if (g.winnerId === series.team2Id) team2Wins++;
  }

  const isComplete = team1Wins >= 4 || team2Wins >= 4;
  const winnerId   = team1Wins >= 4 ? series.team1Id
                   : team2Wins >= 4 ? series.team2Id
                   : null;

  await prisma.playoffSeries.update({
    where: { id: series.id },
    data: {
      team1Wins,
      team2Wins,
      winnerId,
      status:    isComplete ? "COMPLETED" : "ACTIVE",
      updatedAt: new Date(),
    },
  });

  return isComplete ? series.id : null;
}

// ─────────────────────────────────────────────
// Cancel remaining if-necessary games
// ─────────────────────────────────────────────

/**
 * When a series is complete, cancel all remaining SCHEDULED if-necessary games
 * and their pending predictions.
 * Returns the number of games cancelled.
 */
export async function cancelIfNecessaryGames(
  seriesId: string,
  prisma: PrismaClient
): Promise<number> {
  const gamesToCancel = await prisma.game.findMany({
    where: {
      seriesId,
      isIfNecessary: true,
      status:        "SCHEDULED",
    },
    select: { id: true },
  });

  if (gamesToCancel.length === 0) return 0;

  const gameIds = gamesToCancel.map((g) => g.id);

  // Cancel pending predictions first
  await prisma.prediction.updateMany({
    where: { gameId: { in: gameIds }, result: "PENDING" },
    data:  { result: "CANCELLED", pointsEarned: 0 },
  });

  // Cancel the games
  await prisma.game.updateMany({
    where: { id: { in: gameIds } },
    data:  { status: "CANCELLED" },
  });

  console.log(
    `[PLAYOFF] Series ${seriesId} complete — cancelled ${gamesToCancel.length} if-necessary game(s)`
  );

  return gamesToCancel.length;
}

// ─────────────────────────────────────────────
// Bracket data for the bracket page
// ─────────────────────────────────────────────

/**
 * Fetch the full playoff bracket for a season.
 *
 * Seeds are taken from the stored team1Seed / team2Seed fields on PlayoffSeries
 * (set by the fix-playoff-seeds script, which uses a matchup-inference algorithm
 * that correctly handles Play-In results).
 *
 * Fallback: if no stored seeds are found for R1, they are computed on-the-fly
 * from regular-season win% + conference-record tiebreaker.
 */
export async function getPlayoffBracket(season: string, prisma: PrismaClient) {
  const allSeries = await prisma.playoffSeries.findMany({
    where: { season },
    include: {
      team1: {
        select: {
          id:           true,
          name:         true,
          city:         true,
          abbreviation: true,
          conference:   true,
          logoUrl:      true,
          primaryColor: true,
        },
      },
      team2: {
        select: {
          id:           true,
          name:         true,
          city:         true,
          abbreviation: true,
          conference:   true,
          logoUrl:      true,
          primaryColor: true,
        },
      },
      games: {
        orderBy: { gameDate: "asc" },
        select: {
          id:            true,
          gameDate:      true,
          status:        true,
          homeScore:     true,
          awayScore:     true,
          winnerId:      true,
          isIfNecessary: true,
          homeTeamId:    true,
          awayTeamId:    true,
        },
      },
    },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
  });

  // ── Build a global teamId → seed map from stored R1 seeds ───────────────
  // Seeds are set by fix-playoff-seeds and account for Play-In results.
  // We propagate R1 seeds to all rounds so a team always shows their seed
  // (e.g. OKC still shows "1" in the Conference Finals).
  const r1 = allSeries.filter((s) => s.round === 1);
  const seedMap = new Map<string, number>();

  const hasStoredSeeds = r1.some((s) => s.team1Seed !== null || s.team2Seed !== null);

  if (hasStoredSeeds) {
    for (const s of r1) {
      if (s.team1Seed) seedMap.set(s.team1Id, s.team1Seed);
      if (s.team2Seed) seedMap.set(s.team2Id, s.team2Seed);
    }
  } else {
    // ── Fallback: compute from regular-season standings ─────────────────────
    const r1TeamIds = new Set<string>(r1.flatMap((s) => [s.team1Id, s.team2Id]));

    if (r1TeamIds.size > 0) {
      const standings = await prisma.teamSeasonStats.findMany({
        where:  { season, teamId: { in: [...r1TeamIds] } },
        select: { teamId: true, winPct: true, wins: true, conferenceRecord: true },
      });

      const parseConfWins = (rec: string | null) =>
        parseInt((rec ?? "0-0").split("-")[0] ?? "0", 10) || 0;

      const teamConf = new Map<string, string>();
      for (const s of r1) {
        teamConf.set(s.team1Id, s.team1.conference ?? "");
        teamConf.set(s.team2Id, s.team2.conference ?? "");
      }

      const sortFn = (a: typeof standings[0], b: typeof standings[0]) =>
        b.winPct - a.winPct ||
        b.wins   - a.wins   ||
        parseConfWins(b.conferenceRecord) - parseConfWins(a.conferenceRecord);

      const east = standings
        .filter((ts) => (teamConf.get(ts.teamId) ?? "").toUpperCase() === "EAST")
        .sort(sortFn);
      const west = standings
        .filter((ts) => (teamConf.get(ts.teamId) ?? "").toUpperCase() === "WEST")
        .sort(sortFn);

      east.forEach((ts, i) => seedMap.set(ts.teamId, i + 1));
      west.forEach((ts, i) => seedMap.set(ts.teamId, i + 1));
    }
  }

  // Attach seed + normalize order: lower seed (better team) always first
  return allSeries.map((s) => {
    const s1 = seedMap.get(s.team1Id) ?? null;
    const s2 = seedMap.get(s.team2Id) ?? null;

    // Swap team1/team2 so the better seed is always team1
    const swap = s1 !== null && s2 !== null && s1 > s2;

    return {
      ...s,
      team1Id:   swap ? s.team2Id   : s.team1Id,
      team1:     swap ? s.team2     : s.team1,
      team1Wins: swap ? s.team2Wins : s.team1Wins,
      team1Seed: swap ? s2          : s1,
      team2Id:   swap ? s.team1Id   : s.team2Id,
      team2:     swap ? s.team1     : s.team2,
      team2Wins: swap ? s.team1Wins : s.team2Wins,
      team2Seed: swap ? s1          : s2,
      // winnerId stays as-is: it's a team ID ref, unaffected by display swap
      winnerId:  s.winnerId,
    };
  });
}
