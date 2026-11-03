"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { PLAYIN_POINTS, MAX_POINTS } from "@/types/special-predictions";
import { BackButton } from "@/components/ui/back-button";

import { getCurrentSeason } from "@/types/season";
const SEASON = getCurrentSeason();
const P = PLAYIN_POINTS;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamInfo { id: string; abbreviation: string; }
interface PlayInGame {
  id: string;
  status: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
}
interface PlayInConf {
  game78: PlayInGame | null;
  game910: PlayInGame | null;
  gameDeciding: PlayInGame | null;
}
interface PlayInData {
  west: PlayInConf | null;
  east: PlayInConf | null;
}

// ─── Mini game row ────────────────────────────────────────────────────────────

function GameRow({ game }: { game: PlayInGame | null }) {
  if (!game) {
    return (
      <div className="grid grid-cols-[1fr_auto_1fr_20px] items-center gap-3 px-4 py-3 bg-zinc-800/30 rounded-xl opacity-40">
        <span className="text-sm font-bold text-zinc-500">—</span>
        <span className="text-zinc-700 text-sm font-bold">vs</span>
        <span className="text-sm font-bold text-zinc-500 text-right">—</span>
        <span />
      </div>
    );
  }
  const done = game.status === "FINAL";
  const homeWins = done && game.winnerId === game.homeTeamId;
  const awayWins = done && game.winnerId === game.awayTeamId;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_20px] items-center gap-3 px-4 py-3 bg-zinc-800/40 rounded-xl">
      <span className={`text-sm font-bold ${homeWins ? "text-white" : done ? "text-zinc-500" : "text-zinc-300"}`}>
        {game.homeTeam.abbreviation}
      </span>
      <div className="font-black text-base tabular-nums text-center text-white">
        {done ? `${game.homeScore}–${game.awayScore}` : <span className="text-zinc-600 font-normal text-sm">vs</span>}
      </div>
      <span className={`text-sm font-bold text-right ${awayWins ? "text-white" : done ? "text-zinc-500" : "text-zinc-300"}`}>
        {game.awayTeam.abbreviation}
      </span>
      <div className="flex justify-end">
        {done
          ? <span className="text-[10px] text-zinc-600">✓</span>
          : <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse block" />}
      </div>
    </div>
  );
}

function ConfSection({ conf, label }: { conf: PlayInConf | null; label: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
      <div className="space-y-1.5">
        <GameRow game={conf?.game78 ?? null} />
        <GameRow game={conf?.game910 ?? null} />
        <div className="border-t border-zinc-800/60 pt-1.5">
          <p className="text-[10px] text-zinc-700 mb-1.5 px-1">Décisif</p>
          <GameRow game={conf?.gameDeciding ?? null} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostseasonPlayinPage() {
  const [data, setData] = useState<PlayInData | null>(null);
  const [showBareme, setShowBareme] = useState(false);

  useEffect(() => {
    fetch(`/api/playoffs/playin?season=${SEASON}`)
      .then(r => r.json())
      .then(d => setData({ west: d.west, east: d.east }))
      .catch(() => {});
  }, []);

  const allGames = data
    ? [data.west?.game78, data.west?.game910, data.west?.gameDeciding,
       data.east?.game78, data.east?.game910, data.east?.gameDeciding].filter(Boolean)
    : [];
  const started = allGames.length > 0;

  // Paris fermés dès que les matchs ont commencé
  const betOpen = !started;
  const betCls = betOpen
    ? "text-green-400 bg-green-500/10 border border-green-500/20"
    : "text-zinc-600 bg-zinc-800";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PronoseNavbar />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        <BackButton />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Play-in</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Postseason {SEASON}</p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg mt-1 ${data === null ? "text-zinc-600 bg-zinc-800" : betCls}`}>
            {data === null ? "…" : betOpen ? "Ouvert" : "Fermé"}
          </span>
        </div>

        {/* Bracket */}
        {!data ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <ConfSection conf={data.west} label="Ouest" />
            <div className="border-t border-zinc-800/60" />
            <ConfSection conf={data.east} label="Est" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <button
            onClick={() => setShowBareme(true)}
            className="text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded-lg"
          >
            Barème
          </button>
          <Link href="/playoffs" className="text-sm text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-400 px-3 py-1.5 rounded-lg">
            Bracket complet →
          </Link>
        </div>

      </div>

      {/* Barème modal */}
      {showBareme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowBareme(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Barème · Play-in</span>
              <button onClick={() => setShowBareme(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Premier tour (7v8 · 9v10)</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">Vainqueur exact</span><span className="font-mono font-bold text-zinc-200">{P.GAME_WINNER_EXACT} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white font-medium">Bonus 2 matchs conf exacts</span><span className="font-mono font-bold text-[#dcff50]">+{P.FIRST_ROUND_BOTH_EXACT} pts</span></div>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Match décisif</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">Vainqueur exact</span><span className="font-mono font-bold text-zinc-200">{P.DECISIVE_WINNER_EXACT} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white font-medium">Bonus 2 décisifs exacts (Est + Ouest)</span><span className="font-mono font-bold text-[#dcff50]">+{P.DECISIVE_BOTH_EXACT} pts</span></div>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                <span className="text-xs text-zinc-600">Maximum</span>
                <span className="font-mono font-bold text-zinc-300">{MAX_POINTS.POSTSEASON_PLAYIN} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
