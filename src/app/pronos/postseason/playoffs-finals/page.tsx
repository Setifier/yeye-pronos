"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { PLAYOFFS_FINALS_POINTS, MAX_POINTS } from "@/types/special-predictions";
import { fmtPts } from "@/lib/format";
import { BackButton } from "@/components/ui/back-button";

import { getCurrentSeason } from "@/types/season";
const SEASON = getCurrentSeason();
const P = PLAYOFFS_FINALS_POINTS;

interface TeamInfo { id: string; abbreviation: string; }
interface Series {
  id: string;
  round: number | null;
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
    <div className="grid grid-cols-[1fr_auto_1fr_20px] items-center gap-3 px-4 py-4 bg-zinc-800/40 rounded-xl">
      <div className="flex items-center gap-1.5">
        {s.team1Seed != null && <span className="text-[10px] text-zinc-600 tabular-nums w-3">{s.team1Seed}</span>}
        <span className={`text-base font-black ${t1w ? "text-white" : done ? "text-zinc-500" : "text-zinc-300"}`}>{s.team1.abbreviation}</span>
      </div>
      <div className="font-black text-xl tabular-nums flex items-center gap-2">
        <span className={t1w ? "text-white" : "text-zinc-500"}>{s.team1Wins}</span>
        <span className="text-zinc-700">–</span>
        <span className={t2w ? "text-white" : "text-zinc-500"}>{s.team2Wins}</span>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <span className={`text-base font-black ${t2w ? "text-white" : done ? "text-zinc-500" : "text-zinc-300"}`}>{s.team2.abbreviation}</span>
        {s.team2Seed != null && <span className="text-[10px] text-zinc-600 tabular-nums w-3 text-right">{s.team2Seed}</span>}
      </div>
      <div className="flex justify-end">
        {done ? <span className="text-[10px] text-zinc-600">✓</span> : <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />}
      </div>
    </div>
  );
}

export default function PostseasonPlayoffsFinalsPage() {
  const [finals, setFinals] = useState<Series[]>([]);
  const [cfDone, setCfDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showBareme, setShowBareme] = useState(false);

  useEffect(() => {
    fetch(`/api/playoffs/bracket?season=${SEASON}`)
      .then(r => r.json())
      .then(d => {
        const all: Series[] = d.bracket ?? [];
        setFinals(all.filter(s => s.round === 4));
        const cf = all.filter(s => s.round === 3);
        setCfDone(cf.length === 2 && cf.every(s => s.status === "COMPLETED"));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const finalsStarted = finals.length > 0;

  // Paris ouverts uniquement si CF terminées et Finals pas encore commencées
  const betOpen = !finalsStarted && cfDone;
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
            <h1 className="text-2xl font-black tracking-tight">Finale NBA</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Playoffs {SEASON}</p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg mt-1 ${loaded ? betCls : "text-zinc-600 bg-zinc-800"}`}>
            {loaded ? (betOpen ? "Ouvert" : "Fermé") : "…"}
          </span>
        </div>

        {!loaded ? (
          <div className="h-20 bg-zinc-800/40 rounded-xl animate-pulse" />
        ) : finals.length > 0 ? (
          <div className="space-y-1.5">
            {finals.map(s => <SeriesMini key={s.id} s={s} />)}
          </div>
        ) : (
          <div className="py-10 text-center text-zinc-600 text-sm">
            La Finale NBA n&apos;a pas encore commencé
          </div>
        )}

        {betOpen && (
          <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Votre pari</p>
            <p className="text-sm text-zinc-500 italic">Formulaire de pari à venir</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <button onClick={() => setShowBareme(true)} className="text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded-lg">Barème</button>
          <Link href="/playoffs" className="text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded-lg">Bracket complet →</Link>
        </div>
      </div>

      {showBareme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowBareme(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Barème · Finale NBA</span>
              <button onClick={() => setShowBareme(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-zinc-400">Champion NBA exact</span><span className="font-mono font-bold text-zinc-200">{P.CHAMPION} pts</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">+ W/L exact</span><span className="font-mono font-bold text-zinc-200">+{P.WL_BONUS} pts</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-400">MVP Finals exact</span><span className="font-mono font-bold text-zinc-200">{P.MVP_FINALS} pts</span></div>
                <div className="flex justify-between text-sm"><span className="text-white font-medium">Combo ultime (tout exact)</span><span className="font-mono font-bold text-[#dcff50]">+{P.COMBO_ULTIME} pts</span></div>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                <span className="text-xs text-zinc-600">Maximum</span>
                <span className="font-mono font-bold text-zinc-300">{fmtPts(MAX_POINTS.POSTSEASON_PLAYOFFS_FINALS)} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
