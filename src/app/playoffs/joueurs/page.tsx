"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp, Users, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { PlayoffsNavbar } from "@/components/layout/playoffs-navbar";
import { positionLabel } from "@/lib/position";
import { getCurrentSeason } from "@/types/season";
import type { PlayoffLeaderPlayer, PlayoffLeadersResponse, PlayoffStatKey } from "@/app/api/playoffs/joueurs/route";

// ─── Types locaux ─────────────────────────────────────────────

interface ColDef {
  label:      string;
  getValue:   (p: PlayoffLeaderPlayer) => number | null;
  decimals:   number;
  isPercent?: boolean;
  isSigned?:  boolean;
}

interface StatCategory {
  key:     PlayoffStatKey;
  label:   string;
  tab:     string;
  mainCol: ColDef;
  cols:    ColDef[];
}

// ─── Helpers ──────────────────────────────────────────────────

function fmt(v: number | null | undefined, decimals: number, isPercent?: boolean, isSigned?: boolean): string {
  if (v == null) return "–";
  const val = isPercent ? v * 100 : v;
  const str = val.toFixed(decimals);
  return isSigned && val > 0 ? `+${str}` : str;
}

// ─── Accesseurs ───────────────────────────────────────────────

const C = {
  MJ:    (p: PlayoffLeaderPlayer) => p.gamesPlayed,
  MIN:   (p: PlayoffLeaderPlayer) => p.minutesPerGame,
  PTS:   (p: PlayoffLeaderPlayer) => p.pointsPerGame,
  REB:   (p: PlayoffLeaderPlayer) => p.reboundsPerGame,
  REBO:  (p: PlayoffLeaderPlayer) => p.offensiveReboundsPerGame,
  REBD:  (p: PlayoffLeaderPlayer) => p.defensiveReboundsPerGame,
  PD:    (p: PlayoffLeaderPlayer) => p.assistsPerGame,
  INT:   (p: PlayoffLeaderPlayer) => p.stealsPerGame,
  CTR:   (p: PlayoffLeaderPlayer) => p.blocksPerGame,
  BP:    (p: PlayoffLeaderPlayer) => p.turnoversPerGame,
  FP:    (p: PlayoffLeaderPlayer) => p.foulsPerGame,
  TR:    (p: PlayoffLeaderPlayer) => p.fgmPerGame,
  TT:    (p: PlayoffLeaderPlayer) => p.fgaPerGame,
  PTIR:  (p: PlayoffLeaderPlayer) => p.fieldGoalPct,
  "3PR": (p: PlayoffLeaderPlayer) => p.threePmPerGame,
  "3PT": (p: PlayoffLeaderPlayer) => p.threePaPerGame,
  P3P:   (p: PlayoffLeaderPlayer) => p.threePointPct,
  LFR:   (p: PlayoffLeaderPlayer) => p.ftmPerGame,
  LFT:   (p: PlayoffLeaderPlayer) => p.ftaPerGame,
  PLF:   (p: PlayoffLeaderPlayer) => p.freeThrowPct,
  PM:    (p: PlayoffLeaderPlayer) => p.plusMinus,
  DD:    (p: PlayoffLeaderPlayer) => p.doubleDoubles,
  TD:    (p: PlayoffLeaderPlayer) => p.tripleDoubles,
};

const col = (
  label: string,
  getFn: (p: PlayoffLeaderPlayer) => number | null,
  decimals: number,
  opts: { isPercent?: boolean; isSigned?: boolean } = {}
): ColDef => ({ label, getValue: getFn, decimals, ...opts });

// ─── Catégories — identiques à la page leaders ─────────────────

const CATEGORIES: StatCategory[] = [
  // Ligne 1
  { key: "points",             tab: "Points",  label: "Points",              mainCol: col("PTS/M", C.PTS,    1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("TR",C.TR,1),col("TT",C.TT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("3PR",C["3PR"],1),col("3PT",C["3PT"],1),col("%3Pts",C.P3P,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "assists",            tab: "PD",      label: "Passes décisives",    mainCol: col("PD/M",  C.PD,     1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("BP",C.BP,1),col("DD",C.DD,0),col("TD",C.TD,0)] },
  { key: "offensive_rebounds", tab: "REBO",    label: "Rebonds offensifs",   mainCol: col("REBO/M",C.REBO,   1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("PD",C.PD,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("REBD",C.REBD,1),col("REB",C.REB,1)] },
  { key: "defensive_rebounds", tab: "REBD",    label: "Rebonds défensifs",   mainCol: col("REBD/M",C.REBD,   1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("PD",C.PD,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("REBO",C.REBO,1),col("REB",C.REB,1)] },
  { key: "rebounds",           tab: "REB",     label: "Rebonds",             mainCol: col("REB/M", C.REB,    1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("PD",C.PD,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("BP",C.BP,1),col("REBO",C.REBO,1),col("REBD",C.REBD,1)] },
  { key: "steals",             tab: "INT",     label: "Interceptions",       mainCol: col("INT/M", C.INT,    1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("PD",C.PD,1),col("REBO",C.REBO,1),col("REBD",C.REBD,1),col("REB",C.REB,1),col("CTR",C.CTR,1),col("BP",C.BP,1)] },
  { key: "blocks",             tab: "CTR",     label: "Contres",             mainCol: col("CTR/M", C.CTR,    1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("PD",C.PD,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("REBD",C.REBD,1),col("REB",C.REB,1)] },
  { key: "turnovers",          tab: "BP",      label: "Balles perdues",      mainCol: col("BP/M",  C.BP,     1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("DD",C.DD,0),col("+/-",C.PM,0,{isSigned:true})] },
  { key: "personal_fouls",     tab: "FP",      label: "Fautes personnelles", mainCol: col("FP/M",  C.FP,     1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("BP",C.BP,1),col("+/-",C.PM,0,{isSigned:true})] },
  { key: "double_doubles",     tab: "DD",      label: "Double-Doubles",      mainCol: col("DD",    C.DD,     0), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("+/-",C.PM,0,{isSigned:true}),col("TD",C.TD,0),col("%TIR",C.PTIR,1,{isPercent:true})] },
  { key: "triple_doubles",     tab: "TD",      label: "Triple-Doubles",      mainCol: col("TD",    C.TD,     0), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("+/-",C.PM,0,{isSigned:true}),col("DD",C.DD,0),col("%TIR",C.PTIR,1,{isPercent:true})] },
  // Ligne 2
  { key: "fg_made",            tab: "TR",      label: "Tirs réussis",        mainCol: col("TR/M",  C.TR,     1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("TT",C.TT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("3PR",C["3PR"],1),col("3PT",C["3PT"],1),col("%3Pts",C.P3P,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "fg_attempted",       tab: "TT",      label: "Tirs tentés",         mainCol: col("TT/M",  C.TT,     1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("TR",C.TR,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("3PR",C["3PR"],1),col("3PT",C["3PT"],1),col("%3Pts",C.P3P,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "fg_pct",             tab: "%TIR",    label: "% Tirs",              mainCol: col("%TIR",  C.PTIR,   1, {isPercent:true}), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("TR",C.TR,1),col("TT",C.TT,1),col("3PR",C["3PR"],1),col("3PT",C["3PT"],1),col("%3Pts",C.P3P,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "three_made",         tab: "3PR",     label: "3 pts réussis",       mainCol: col("3PR/M", C["3PR"], 1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("3PT",C["3PT"],1),col("%3Pts",C.P3P,1,{isPercent:true}),col("TR",C.TR,1),col("TT",C.TT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "three_attempted",    tab: "3PT",     label: "3 pts tentés",        mainCol: col("3PT/M", C["3PT"], 1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("3PR",C["3PR"],1),col("%3Pts",C.P3P,1,{isPercent:true}),col("TR",C.TR,1),col("TT",C.TT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "three_pct",          tab: "%3Pts",   label: "% 3 points",          mainCol: col("%3Pts", C.P3P,    1, {isPercent:true}), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("3PR",C["3PR"],1),col("3PT",C["3PT"],1),col("TR",C.TR,1),col("TT",C.TT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("%LF",C.PLF,1,{isPercent:true})] },
  { key: "ft_made",            tab: "LFR",     label: "LF réussis",          mainCol: col("LFR/M", C.LFR,    1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("LFT",C.LFT,1),col("%LF",C.PLF,1,{isPercent:true}),col("TR",C.TR,1),col("%TIR",C.PTIR,1,{isPercent:true})] },
  { key: "ft_attempted",       tab: "LFT",     label: "LF tentés",           mainCol: col("LFT/M", C.LFT,    1), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("LFR",C.LFR,1),col("%LF",C.PLF,1,{isPercent:true}),col("TR",C.TR,1),col("%TIR",C.PTIR,1,{isPercent:true})] },
  { key: "ft_pct",             tab: "%LF",     label: "% Lancers francs",    mainCol: col("%LF",   C.PLF,    1, {isPercent:true}), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("LFR",C.LFR,1),col("LFT",C.LFT,1),col("TR",C.TR,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("%3Pts",C.P3P,1,{isPercent:true}),col("DD",C.DD,0)] },
  { key: "minutes",            tab: "MIN",     label: "Minutes",             mainCol: col("MIN/M", C.MIN,    1), cols: [col("MJ",C.MJ,0),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("BP",C.BP,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("DD",C.DD,0),col("+/-",C.PM,0,{isSigned:true})] },
  { key: "plus_minus",         tab: "+/-",     label: "+/-",                 mainCol: col("+/-",   C.PM,     0, {isSigned:true}), cols: [col("MJ",C.MJ,0),col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("%TIR",C.PTIR,1,{isPercent:true}),col("DD",C.DD,0),col("BP",C.BP,1)] },
  { key: "games_played",       tab: "MJ",      label: "Matchs joués",        mainCol: col("MJ",    C.MJ,     0), cols: [col("MIN",C.MIN,1),col("PTS",C.PTS,1),col("REB",C.REB,1),col("PD",C.PD,1),col("INT",C.INT,1),col("CTR",C.CTR,1),col("BP",C.BP,1),col("DD",C.DD,0),col("+/-",C.PM,0,{isSigned:true})] },
];

// ─── Sous-composants ──────────────────────────────────────────

function rankColor(r: number) {
  if (r === 1) return "text-yellow-400";
  if (r === 2) return "text-zinc-300";
  if (r === 3) return "text-amber-600";
  return "text-zinc-500";
}

function PlayerAvatar({ headshot, name, color }: { headshot: string | null; name: string; color: string | null }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (!headshot || err) {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ background: color ? `${color}22` : "#27272a", border: `1.5px solid ${color ?? "#3f3f46"}55` }}>
        {initials}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800">
      <Image src={headshot} alt={name} width={36} height={36} className="object-cover w-full h-full" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

function LeaderRow({ player, category, odd, isTied }: { player: PlayoffLeaderPlayer; category: StatCategory; odd: boolean; isTied: boolean }) {
  const mainVal = category.mainCol.getValue(player);
  return (
    <Link href={`/joueurs/${player.playerId}`}
      className={`flex items-center gap-0 px-3 sm:px-4 py-2.5 transition-colors border-b border-zinc-800/40 last:border-0 hover:bg-zinc-800/40 group ${odd ? "bg-zinc-800/15" : ""}`}
    >
      <div className={`w-8 flex-shrink-0 text-right pr-2 text-sm font-bold tabular-nums ${isTied ? "text-zinc-500" : rankColor(player.rank)}`}>
        {isTied ? "=" : player.rank}
      </div>
      <div className="flex-shrink-0 mr-2.5">
        <PlayerAvatar headshot={player.headshot} name={player.fullName} color={player.teamColor} />
      </div>
      <div className="w-48 flex-shrink-0 border-r border-zinc-700/40 pr-3 overflow-hidden">
        <p className="text-sm font-semibold text-white leading-tight group-hover:text-red-300 transition-colors whitespace-nowrap">
          {player.firstName} <span className="font-black">{player.lastName}</span>
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {player.teamColor && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: player.teamColor }} />}
          <span className="text-[11px] text-zinc-400 font-medium truncate">
            {player.teamCity && player.teamName ? `${player.teamCity} ${player.teamName}` : player.teamAbbr ?? "–"}
          </span>
          {player.position && <span className="text-[10px] text-zinc-500 flex-shrink-0">· {positionLabel(player.position)}</span>}
        </div>
      </div>
      <div className="flex-1 hidden md:flex items-center justify-around pl-3">
        {category.cols.map((c, i) => (
          <div key={i} className="text-center">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide leading-none">{c.label}</p>
            <p className="text-xs text-zinc-400 tabular-nums font-medium mt-0.5">{fmt(c.getValue(player), c.decimals, c.isPercent, c.isSigned)}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 md:hidden" />
      <div className="flex-shrink-0 text-right w-14 pl-2">
        <p className={`text-lg sm:text-xl font-black tabular-nums leading-none ${player.rank === 1 && !isTied ? "text-yellow-400" : "text-white"}`}>
          {fmt(mainVal, category.mainCol.decimals, category.mainCol.isPercent, category.mainCol.isSigned)}
        </p>
        <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-wide mt-0.5">{category.mainCol.label}</p>
      </div>
    </Link>
  );
}

function SkeletonRow({ odd }: { odd: boolean }) {
  return (
    <div className={`flex items-center gap-0 px-4 py-2.5 border-b border-zinc-800/40 last:border-0 ${odd ? "bg-zinc-800/15" : ""}`}>
      <div className="w-8 flex-shrink-0 pr-2"><div className="h-4 w-5 bg-zinc-800 rounded ml-auto animate-pulse" /></div>
      <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0 animate-pulse mr-2.5" />
      <div className="w-48 flex-shrink-0 border-r border-zinc-700/40 pr-3 space-y-1.5">
        <div className="h-3.5 bg-zinc-800 rounded w-36 animate-pulse" />
        <div className="h-2.5 bg-zinc-800 rounded w-28 animate-pulse" />
      </div>
      <div className="flex-1 hidden md:flex justify-around pl-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-2 bg-zinc-800 rounded w-6 mx-auto animate-pulse" />
            <div className="h-3 bg-zinc-800 rounded w-5 mx-auto animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex-1 md:hidden" />
      <div className="w-14 flex-shrink-0 space-y-1 text-right pl-2">
        <div className="h-5 bg-zinc-800 rounded w-10 ml-auto animate-pulse" />
        <div className="h-2 bg-zinc-800 rounded w-7 ml-auto animate-pulse" />
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else if (page <= 4) { for (let i = 1; i <= 5; i++) pages.push(i); pages.push("…"); pages.push(totalPages); }
  else if (page >= totalPages - 3) { pages.push(1); pages.push("…"); for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i); }
  else { pages.push(1); pages.push("…"); pages.push(page - 1); pages.push(page); pages.push(page + 1); pages.push("…"); pages.push(totalPages); }
  return (
    <div className="flex items-center justify-center gap-1 py-6 flex-wrap">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <ChevronLeft className="h-4 w-4" />Précédent
      </button>
      {pages.map((p, i) => p === "…" ? (
        <span key={`e${i}`} className="w-8 text-center text-zinc-600 text-sm">…</span>
      ) : (
        <button key={p} onClick={() => onPage(p as number)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${p === page ? "bg-red-500 text-white" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{p}</button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        Suivant<ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────

const SEASON = getCurrentSeason();

export default function PlayoffJoueursPage() {
  const [activeStat, setActiveStat] = useState<PlayoffStatKey>("points");
  const [sortDir, setSortDir]       = useState<"desc" | "asc">("desc");
  const [page, setPage]             = useState(1);
  const [data, setData]             = useState<PlayoffLeadersResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const tableRef                    = useRef<HTMLDivElement>(null);

  const activeCategory = CATEGORIES.find((c) => c.key === activeStat) ?? CATEGORIES[0]!;

  const fetchLeaders = useCallback(async (stat: string, p: number, dir: "desc" | "asc") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playoffs/joueurs?stat=${stat}&season=${SEASON}&page=${p}&order=${dir}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaders(activeStat, page, sortDir); }, [activeStat, page, sortDir, fetchLeaders]);

  const handleTabChange = (key: PlayoffStatKey) => {
    if (key === activeStat) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setActiveStat(key); setSortDir("desc"); }
    setPage(1); setData(null);
  };

  const handlePage = (p: number) => {
    setPage(p);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const leaders    = data?.leaders    ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;
  const offset     = (page - 1) * 50;

  const { decimals, isPercent, isSigned } = activeCategory.mainCol;
  const tiedSet = new Set<number>();
  for (let i = 1; i < leaders.length; i++) {
    const cur = leaders[i]?.statValue, prev = leaders[i - 1]?.statValue;
    if (cur != null && prev != null && fmt(cur, decimals, isPercent, isSigned) === fmt(prev, decimals, isPercent, isSigned))
      tiedSet.add(i);
  }

  const tabBtn = (cat: StatCategory) => {
    const isActive = activeStat === cat.key;
    return (
      <button key={cat.key} onClick={() => handleTabChange(cat.key)}
        className={`flex-shrink-0 inline-flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          isActive ? "bg-red-500 text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
        }`}
      >
        {cat.tab}
        {isActive && (sortDir === "desc" ? <ArrowDown className="h-3 w-3 flex-shrink-0" /> : <ArrowUp className="h-3 w-3 flex-shrink-0" />)}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PlayoffsNavbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-red-400" />
          <div>
            <h1 className="text-2xl font-black tracking-tight">Stats joueurs — Playoffs</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Playoffs {SEASON} · tous les joueurs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[calc(4rem+3rem)] z-30 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-1.5 space-y-1">
            <div className="flex justify-center gap-1">{CATEGORIES.slice(0, 11).map(tabBtn)}</div>
            <div className="flex justify-center gap-1">{CATEGORIES.slice(11).map(tabBtn)}</div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6" ref={tableRef}>
        <div className="flex items-center mb-2 px-3 sm:px-4">
          <div className="flex-shrink-0 flex items-center gap-2" style={{ width: "270px" }}>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{activeCategory.label}</span>
            {!loading && totalCount > 0 && <span className="text-xs text-zinc-700">— {totalCount} joueurs</span>}
          </div>
          <div className="flex-1 hidden md:flex justify-around pl-3">
            {activeCategory.cols.map((c, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wide">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="flex-1 md:hidden" />
          <div className="flex-shrink-0 text-right w-14 pl-2">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide">{activeCategory.mainCol.label}</p>
          </div>
        </div>

        <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden">
          {loading ? (
            Array.from({ length: 15 }, (_, i) => <SkeletonRow key={i} odd={i % 2 === 0} />)
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-zinc-400 text-sm">{error}</p>
              <button onClick={() => fetchLeaders(activeStat, page, sortDir)} className="text-xs text-red-400 hover:text-red-300 underline">Réessayer</button>
            </div>
          ) : leaders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="h-10 w-10 text-zinc-700" />
              <p className="text-zinc-500 text-sm">Aucune donnée playoffs disponible.</p>
            </div>
          ) : (
            leaders.map((player, idx) => (
              <LeaderRow key={player.playerId} player={player} category={activeCategory} odd={(offset + idx) % 2 === 0} isTied={tiedSet.has(idx)} />
            ))
          )}
        </div>

        {!loading && !error && <Pagination page={page} totalPages={totalPages} onPage={handlePage} />}

        {!loading && leaders.length > 0 && (
          <p className="text-center text-[11px] text-zinc-700 mt-2">
            Playoffs {SEASON} uniquement · saison régulière et Play-In non inclus
          </p>
        )}
      </div>
    </div>
  );
}
