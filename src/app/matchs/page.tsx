"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trophy, Zap, CalendarX2, Eye, EyeOff } from "lucide-react";
import { DateNavigation } from "@/components/matchs/date-navigation";
import { MobileNightPicker } from "@/components/mobile/night-picker";
import { GameBetCard } from "@/components/bets/game-bet-card";
import { useBetGames } from "@/components/bets/use-bet-games";
import { useNow, useNoSpoil } from "@/components/bets/hooks";
import { missingBets } from "@/types/bet";
import type { BetGame } from "@/types/bet";
import {
  formatNight,
  getCurrentNightDate,
  localDateToNightDate,
  nightDateToLocalDate,
} from "@/lib/game-night";

interface DayStats {
  total: number;
  won: number;
  lost: number;
  noPrediction: number;
  pending: number;
  totalPoints: number;
  winRate: number;
  isAfterRegistration: boolean;
}

export default function MatchsPage() {
  // Par défaut : la nuit NBA en cours (date US Eastern), pas la date de Paris
  const [selectedDate, setSelectedDate] = useState<Date>(() => nightDateToLocalDate(getCurrentNightDate()));
  const [noSpoil, setNoSpoil] = useNoSpoil();
  const now = useNow(30_000);
  const bets = useBetGames(noSpoil);
  const { setGames } = bets;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayStats, setDayStats] = useState<DayStats | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const nightDate = localDateToNightDate(selectedDate);
  const night = formatNight(nightDate, new Date(now));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/bets?date=${nightDate}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { games: BetGame[] }) => { if (!cancelled) setGames(d.games ?? []); })
      .catch(() => { if (!cancelled) { setGames([]); setError("Impossible de charger les matchs."); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    fetch(`/api/pronos/day-stats?date=${nightDate}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setDayStats(d?.stats ?? null); })
      .catch(() => { if (!cancelled) setDayStats(null); });

    return () => { cancelled = true; };
  }, [nightDate, setGames, reloadKey]);

  const games = bets.games;
  const missing = useMemo(
    () => missingBets(games, now).sort((a, b) => a.predictionDeadline.localeCompare(b.predictionDeadline)),
    [games, now]
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Mobile : en-tête compact + bande des nuits (collant) */}
      <div className="sticky top-16 z-20 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md md:hidden">
        <MobileNightPicker
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          noSpoil={noSpoil}
          onToggleNoSpoil={() => setNoSpoil(!noSpoil)}
        />
      </div>

      {/* Mobile : la nuit choisie + gros bouton pour parier */}
      <div className="space-y-3 px-4 pt-4 md:hidden">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {night.relative && <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5096ff]">{night.relative}</p>}
            <p className="text-sm font-semibold text-white first-letter:uppercase">{night.night}</p>
          </div>
          {!noSpoil && dayStats && dayStats.total > 0 && dayStats.isAfterRegistration && (
            <span className="flex-shrink-0 rounded-full bg-[#dcff50]/10 px-3 py-1 text-sm font-black tabular-nums text-[#dcff50]">
              +{dayStats.totalPoints} pts
            </span>
          )}
        </div>
        {missing.length > 0 && (
          <button
            onClick={() => bets.openSheet(missing, 0)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6a5a] to-[#ff3b3b] text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-[#ff5050]/25 active:scale-[0.98] transition-transform"
          >
            <Zap className="h-4 w-4 fill-white" />
            Parier · {missing.length} match{missing.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* En-tête */}
      <div className="hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Matchs</h1>
            <p className="text-sm text-zinc-500">Pronos ouverts jusqu&apos;au coup d&apos;envoi · heures de Paris</p>
          </div>
          <button
            onClick={() => setNoSpoil(!noSpoil)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              noSpoil ? "border-[#ff5050]/30 bg-[#ff5050]/10 text-[#ff5050]" : "border-zinc-700 bg-zinc-900 text-zinc-300"
            }`}
          >
            {noSpoil ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{noSpoil ? "No Spoil" : "Scores visibles"}</span>
          </button>
        </div>
      </div>

      {/* Navigation par date */}
      <div className="sticky top-16 z-20 hidden border-b border-zinc-800 bg-zinc-950 md:block">
        <div className="mx-auto max-w-6xl">
          <DateNavigation selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </div>
      </div>

      {/* Bandeau de la nuit */}
      <div className="hidden border-b border-zinc-800 bg-zinc-950 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-white">
              {night.relative && <span className="mr-2 text-[#5096ff]">{night.relative}</span>}
              {night.night}
            </p>
            {!noSpoil && dayStats && dayStats.total > 0 && dayStats.isAfterRegistration && (
              <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                <Trophy className="h-3.5 w-3.5 text-[#5096ff]" />
                <span className="text-green-400">{dayStats.won} réussi{dayStats.won > 1 ? "s" : ""}</span>
                <span className="text-zinc-400">{dayStats.lost} raté{dayStats.lost > 1 ? "s" : ""}</span>
                {dayStats.noPrediction > 0 && <span className="text-zinc-500">({dayStats.noPrediction} sans prono)</span>}
                <span className="font-semibold text-[#dcff50]">+{dayStats.totalPoints} pts</span>
              </p>
            )}
          </div>
          {missing.length > 0 && (
            <button
              onClick={() => bets.openSheet(missing, 0)}
              className="flex items-center gap-2 rounded-xl bg-[#ff5050] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ff5050]/20 hover:bg-[#ff5050]/90"
            >
              <Zap className="h-4 w-4" />
              {missing.length === 1 ? "Parier sur le match restant" : `Parier sur les ${missing.length} matchs restants`}
            </button>
          )}
        </div>
      </div>

      {/* Matchs */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 md:py-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#5096ff]" /></div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="mb-4 text-red-400">{error}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700">Réessayer</button>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <CalendarX2 className="h-10 w-10 text-zinc-700" />
            <p className="text-zinc-400">Aucun match cette nuit-là</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      </main>

      {bets.overlays}
    </div>
  );
}
