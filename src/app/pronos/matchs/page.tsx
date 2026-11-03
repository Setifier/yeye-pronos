"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { GameBetCard } from "@/components/bets/game-bet-card";
import { useBetGames } from "@/components/bets/use-bet-games";
import { useNow, useNoSpoil } from "@/components/bets/hooks";
import type { BetGame } from "@/types/bet";
import { formatNight, getCurrentNightDate } from "@/lib/game-night";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

interface Stats {
  won: number;
  lost: number;
  winRate: number;
  bonEcart: number;
  topScorer: number;
  comboUltime: number;
  totalPoints: number;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function PronosMatchsPage() {
  const router = useRouter();
  const now = useNow(30_000);
  const [noSpoil, setNoSpoil] = useNoSpoil();
  const bets = useBetGames(noSpoil);
  const { setGames } = bets;
  const [stats, setStats] = useState<Stats | null>(null);
  const [month, setMonth] = useState(() => getCurrentNightDate().slice(0, 7));
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([getCurrentNightDate()]));

  useEffect(() => {
    fetch("/api/pronos?statsOnly=1")
      .then((r) => { if (r.status === 401) { router.push("/auth/login"); throw new Error(); } return r.json(); })
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/bets?month=${month}`)
      .then((r) => r.json())
      .then((d: { games: BetGame[]; availableMonths?: string[] }) => {
        if (cancelled) return;
        setGames(d.games ?? []);
        if (d.availableMonths) setMonths(d.availableMonths);
        // Ouvre la nuit en cours, sinon la nuit la plus récente du mois
        const nights = [...new Set((d.games ?? []).map((g) => g.nightDate))].sort().reverse();
        const current = getCurrentNightDate();
        const pastOrCurrent = nights.find((n) => n <= current);
        setExpanded(new Set([nights.includes(current) ? current : pastOrCurrent ?? nights[nights.length - 1]].filter(Boolean) as string[]));
      })
      .catch(() => { if (!cancelled) setGames([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, setGames]);

  // Regroupement par nuit (plus récente en haut)
  const nights = useMemo(() => {
    const map = new Map<string, BetGame[]>();
    for (const g of bets.games) map.set(g.nightDate, [...(map.get(g.nightDate) ?? []), g]);
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [bets.games]);

  const toggle = (night: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(night)) next.delete(night); else next.add(night);
      return next;
    });

  const season = getCurrentSeason();

  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      <PronoseNavbar />

      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Mes pronos — Matchs</h1>
              <p className="text-sm text-zinc-500">Saison {getSeasonLabel(season)} · tous tes paris nuit par nuit</p>
            </div>
            <button
              onClick={() => setNoSpoil(!noSpoil)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                noSpoil ? "border-[#ff5050]/30 bg-[#ff5050]/10 text-[#ff5050]" : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
            >
              {noSpoil ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{noSpoil ? "No Spoil" : "Scores visibles"}</span>
            </button>
          </div>

          {stats && (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <StatTile label="Points" value={stats.totalPoints} accent />
              <StatTile label="Réussis" value={stats.won} />
              <StatTile label="Réussite" value={`${Math.round(stats.winRate)}%`} />
              <StatTile label="Bons écarts" value={stats.bonEcart} />
              <StatTile label="Top scorers" value={stats.topScorer} />
              <StatTile label="Combos" value={stats.comboUltime} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Mois */}
        {months.length > 0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            <CalendarDays className="mt-2 h-4 w-4 flex-shrink-0 text-zinc-600" />
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
                  month === m ? "bg-[#5096ff] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {monthLabel(m)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#5096ff]" /></div>
        ) : nights.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 py-16 text-center">
            <CalendarDays className="h-10 w-10 text-zinc-700" />
            <p className="text-zinc-400">Aucun match ce mois-ci</p>
            <Link href="/matchs" className="rounded-xl bg-[#5096ff] px-4 py-2 text-sm font-semibold text-white">Voir le calendrier</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {nights.map(([night, games]) => {
              const label = formatNight(night, new Date(now));
              const open = expanded.has(night);
              const withBet = games.filter((g) => g.prediction);
              const graded = withBet.filter((g) => g.prediction?.result === "WON" || g.prediction?.result === "LOST");
              const won = graded.filter((g) => g.prediction?.result === "WON").length;
              const points = withBet.reduce((s, g) => s + (g.prediction?.pointsEarned ?? 0), 0);
              return (
                <section key={night} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
                  <button onClick={() => toggle(night)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-zinc-800/40">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {label.relative && <span className="mr-2 text-[#5096ff]">{label.relative}</span>}
                        {label.night}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {games.length} match{games.length > 1 ? "s" : ""} · {withBet.length} prono{withBet.length > 1 ? "s" : ""}
                        {!noSpoil && graded.length > 0 && (
                          <> · <span className="text-white">{won}/{graded.length}</span> réussis · <span className="font-semibold text-[#dcff50]">+{points} pts</span></>
                        )}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="grid gap-3 border-t border-zinc-800 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {games.map((g) => (
                        <GameBetCard
                          key={g.id}
                          game={g}
                          now={now}
                          noSpoil={noSpoil}
                          saving={bets.savingId === g.id}
                          onQuickPick={bets.quickPick}
                          onOpen={bets.openGame}
                          onShowBoxscore={bets.showBoxscore}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {bets.overlays}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5">
      <p className={`text-lg font-black tabular-nums ${accent ? "text-[#dcff50]" : "text-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
