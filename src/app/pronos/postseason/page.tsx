import Link from "next/link";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { SPECIAL_PRED_WINDOWS } from "@/types/special-predictions";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

// Statuts calculés depuis la DB à chaque requête (sinon Next figerait la page au build)
export const dynamic = "force-dynamic";

type BetStatus = "locked" | "open";
type Phase = "upcoming" | "open" | "running" | "done";

function statusBadge(s: BetStatus) {
  if (s === "open") {
    return { cls: "text-green-400 bg-green-500/10 border border-green-500/20", label: "Ouvert" };
  }
  return { cls: "text-zinc-600 bg-zinc-800", label: "Fermé" };
}

export default async function PostseasonPage() {
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

  const regTotal    = count("Regular Season");
  const regDone     = regTotal > 0 && count("Regular Season", ["FINAL", "CANCELLED", "POSTPONED"]) === regTotal;
  const playInTotal = count("Play-In Tournament");
  const playInStarted = playInTotal > 0 && count("Play-In Tournament", ["LIVE", "FINAL"]) > 0;
  const playInDone  = playInTotal > 0 && count("Play-In Tournament", ["FINAL", "CANCELLED"]) === playInTotal;

  const round    = (r: number) => series.filter((s) => s.round === r);
  const started  = (r: number) => round(r).length > 0;
  const complete = (r: number) => round(r).length > 0 && round(r).every((s) => s.status === "COMPLETED");

  // Phase de chaque pari : ouvert quand le tour précédent est terminé, fermé dès le 1er match du tour
  const phase = (isStarted: boolean, isDone: boolean, previousDone: boolean): Phase =>
    isDone ? "done" : isStarted ? "running" : previousDone ? "open" : "upcoming";

  const phases: Record<string, Phase> = {
    POSTSEASON_PLAYIN:          phase(playInStarted, playInDone, regDone),
    POSTSEASON_PLAYOFFS_R1:     phase(started(1), complete(1), playInDone),
    POSTSEASON_PLAYOFFS_R2:     phase(started(2), complete(2), complete(1)),
    POSTSEASON_PLAYOFFS_CF:     phase(started(3), complete(3), complete(2)),
    POSTSEASON_PLAYOFFS_FINALS: phase(started(4), complete(4), complete(3)),
  };

  const ITEMS: { href: string; type: keyof typeof SPECIAL_PRED_WINDOWS }[] = [
    { href: "/pronos/postseason/playin",          type: "POSTSEASON_PLAYIN" },
    { href: "/pronos/postseason/playoffs-r1",     type: "POSTSEASON_PLAYOFFS_R1" },
    { href: "/pronos/postseason/playoffs-r2",     type: "POSTSEASON_PLAYOFFS_R2" },
    { href: "/pronos/postseason/playoffs-cf",     type: "POSTSEASON_PLAYOFFS_CF" },
    { href: "/pronos/postseason/playoffs-finals", type: "POSTSEASON_PLAYOFFS_FINALS" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PronoseNavbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight">Saison / Postseason</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Play-in + Playoffs · Saison {getSeasonLabel(SEASON)}</p>
        </div>

        <div className="space-y-3">
          {ITEMS.map(({ href, type }) => {
            const meta = SPECIAL_PRED_WINDOWS[type];
            const p    = phases[type];
            const badge = statusBadge(p === "open" ? "open" : "locked");
            const note =
              p === "done"    ? "Terminé" :
              p === "running" ? "Paris clôturés — tour en cours" :
              p === "open"    ? `Paris ouverts · fermeture : ${meta.closes.toLowerCase()}` :
                                `Ouverture : ${meta.opens.toLowerCase()}`;
            return (
              <Link key={href} href={href}
                className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 hover:bg-zinc-800/60 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-zinc-100">{meta.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{meta.description}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{note}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
