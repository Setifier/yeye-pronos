"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { PLAYOFFS_CF_POINTS, MAX_POINTS } from "@/types/special-predictions";
import { fmtPts } from "@/lib/format";
import { BackButton } from "@/components/ui/back-button";

import { getCurrentSeason } from "@/types/season";
const SEASON = getCurrentSeason();
const P = PLAYOFFS_CF_POINTS;

interface TeamInfo { id: string; abbreviation: string; }
interface Series {
  id: string;
  round: number | null;
  conference: string | null;
  team1: TeamInfo;
  team2: TeamInfo;
  team1Wins: number;
  team2Wins: number;
  team1Seed: number | null;
  team2Seed: number | null;
  winnerId: string | null;
  status: "ACTIVE" | "COMPLETED";
}

function SeriesMini({ s }: { s: Series }) {
  const done = s.status === "COMPLETED";
  const t1w = done && s.winnerId === s.team1.id;
  const t2w = done && s.winnerId === s.team2.id;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_20px] items-center gap-3 px-4 py-3 bg-zinc-800/40 rounded-xl">
      <div className="flex items-center gap-1.5">
        {s.team1Seed != null && <span className="text-[10px] text-zinc-600 tabular-nums w-3">{s.team1Seed}</span>}
        <span className={`text-sm font-bold ${t1w ? "text-white" : done ? "text-zinc-500" : "text-zinc-300"}`}>{s.team1.abbreviation}</span>
      </div>
      <div className="font-black text-base tabular-nums flex items-center gap-1.5">
        <span className={t1w ? "text-white" : "text-zinc-500"}>{s.team1Wins}</span>
        <span className="text-zinc-700 text-sm">–</span>
        <span className={t2w ? "text-white" : "text-zinc-500"}>{s.team2Wins}</span>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <span className={`text-sm font-bold ${t2w ? "text-white" : done ? "text-zinc-500" : "text-zinc-300"}`}>{s.team2.abbreviation}</span>
        {s.team2Seed != null && <span className="text-[10px] text-zinc-600 tabular-nums w-3 text-right">{s.team2Seed}</span>}
      </div>
      <div className="flex justify-end">
        {done ? <span className="text-[10px] text-zinc-600">✓</span> : <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse block" />}
      </div>
    </div>
  );
}

export default function PostseasonPlayoffsCFPage() {
  const [all, setAll] = useState<Series[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showBareme, setShowBareme] = useState(false);

  useEffect(() => {
    fetch(`/api/playoffs/bracket?season=${SEASON}`)
      .then(r => r.json())
      .then(d => { setAll(d.bracket ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const cf = all.filter(s => s.round === 3);
  const finals = all.filter(s => s.round === 4);

  const started = cf.length > 0;
  // Paris fermés dès que les CF ont commencé
  const betOpen = !started;
  const betCls = betOpen
    ? "text-green-400 bg-green-500/10 border border-green-500/20"
    : "text-zinc-600 bg-zinc-800";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PronoseNavbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        <BackButton />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Finales de conférence</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Playoffs {SEASON}</p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg mt-1 ${loaded ? betCls : "text-zinc-600 bg-zinc-800"}`}>
            {loaded ? (betOpen ? "Ouvert" : "Fermé") : "…"}
          </span>
        </div>

        {!loaded ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {cf.length > 0 ? (
              <>
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Finales de conférence</p>
                  <div className="space-y-1.5">{cf.map(s => <SeriesMini key={s.id} s={s} />)}</div>
                </div>
                {finals.length > 0 && (
                  <>
                    <div className="border-t border-zinc-800/60" />
                    <div>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Finale NBA</p>
                      <div className="space-y-1.5">{finals.map(s => <SeriesMini key={s.id} s={s} />)}</div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="py-10 text-center text-zinc-600 text-sm">
                Les Finales de conférence n&apos;ont pas encore commencé
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <button onClick={() => setShowBareme(true)} className="text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded-lg">Barème</button>
          <Link href="/playoffs" className="text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded-lg">Bracket complet →</Link>
        </div>
      </div>

      {showBareme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowBareme(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Barème · Finales de conf</span>
              <button onClick={() => setShowBareme(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Finales de conf (×2)</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">Vainqueur</span><span className="font-mono font-bold text-zinc-200">{P.CF_SERIES_WINNER} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">+ W/L</span><span className="font-mono font-bold text-zinc-200">+{P.CF_SERIES_WL_BONUS} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white font-medium">Les 2 finalistes exacts</span><span className="font-mono font-bold text-[#dcff50]">+{P.ALL_CF_WINNERS_BONUS} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white font-medium">Les 2 W/L exacts</span><span className="font-mono font-bold text-[#dcff50]">+{P.ALL_CF_WL_BONUS} pts</span></div>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Finale NBA</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">Champion</span><span className="font-mono font-bold text-zinc-200">{P.FINALS_CHAMPION} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">+ W/L</span><span className="font-mono font-bold text-zinc-200">+{P.FINALS_WL_BONUS} pts</span></div>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                <span className="text-xs text-zinc-600">Maximum</span>
                <span className="font-mono font-bold text-zinc-300">{fmtPts(MAX_POINTS.POSTSEASON_PLAYOFFS_CF)} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
