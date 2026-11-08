import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/types/season";
import { getPreseasonDeadline } from "@/lib/special-bets";

export const dynamic = "force-dynamic";

/**
 * GET /api/pronos/bet-status
 *
 * Statut des paris postseason de la saison en cours :
 *   "open"   = paris actuellement ouverts
 *   "locked" = paris fermés (pas encore ouverts, ou déjà clôturés)
 *
 * Règle commune (identique à /pronos/postseason) : un pari ouvre quand le tour
 * précédent est terminé et ferme dès que le premier match de son tour commence.
 *   Play-in → ouvre à la fin de la saison régulière
 *   1er tour → ouvre à la fin du Play-in
 *   2e tour, Finales de conf, Finale NBA → ouvrent à la fin du tour précédent
 */
export async function GET() {
  const SEASON = getCurrentSeason();

  const [series, games] = await Promise.all([
    prisma.playoffSeries.findMany({
      where:  { season: SEASON },
      select: { round: true, status: true },
    }),
    prisma.game.groupBy({
      by:    ["seasonType", "status"],
      where: { season: SEASON, seasonType: { in: ["Regular Season", "Play-In Tournament"] } },
      _count: { _all: true },
    }),
  ]);

  const count = (type: string, statuses?: string[]) =>
    games
      .filter((g) => g.seasonType === type && (!statuses || statuses.includes(g.status)))
      .reduce((s, g) => s + g._count._all, 0);

  const regTotal      = count("Regular Season");
  const regDone       = regTotal > 0 && count("Regular Season", ["FINAL", "CANCELLED", "POSTPONED"]) === regTotal;
  const playInTotal   = count("Play-In Tournament");
  const playInStarted = playInTotal > 0 && count("Play-In Tournament", ["LIVE", "FINAL"]) > 0;
  const playInDone    = playInTotal > 0 && count("Play-In Tournament", ["FINAL", "CANCELLED"]) === playInTotal;

  const round    = (r: number) => series.filter((s) => s.round === r);
  const started  = (r: number) => round(r).length > 0;
  const complete = (r: number) => round(r).length > 0 && round(r).every((s) => s.status === "COMPLETED");

  const status = (isStarted: boolean, previousDone: boolean) =>
    !isStarted && previousDone ? "open" : "locked";

  // Début de saison : ouverts jusqu'à la date limite de la saison (PRESEASON_DEADLINES)
  const preseasonDeadline = await getPreseasonDeadline(prisma, SEASON);
  const preseason = Date.now() < preseasonDeadline.getTime() ? "open" : "locked";

  return NextResponse.json({
    season: SEASON,
    preseasonDeadline: preseasonDeadline.toISOString(),
    PRESEASON_NBA_CUP_CHAMPION: preseason,
    PRESEASON_MVP_SEASON:       preseason,
    PRESEASON_DPOY:             preseason,
    PRESEASON_ROOKIE:           preseason,
    PRESEASON_NBA_STANDINGS:    preseason,
    PRESEASON_BRACKET:          preseason,
    POSTSEASON_PLAYIN:          status(playInStarted, regDone),
    POSTSEASON_PLAYOFFS_R1:     status(started(1), playInDone),
    POSTSEASON_PLAYOFFS_R2:     status(started(2), complete(1)),
    POSTSEASON_PLAYOFFS_CF:     status(started(3), complete(2)),
    POSTSEASON_PLAYOFFS_FINALS: status(started(4), complete(3)),
  });
}
