"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { NbaCupNavbar } from "@/components/layout/nba-cup-navbar";
import { useViewedSeason } from "@/components/archives/season-context";
import { getTeamLogo } from "@/lib/nba-logos";
import type { NbaCupTeamStats, NbaCupTeamsResponse } from "@/app/api/nba-cup/equipes/route";

// ─── Colonnes ─────────────────────────────────────────────────

type SortKey = keyof Pick<
  NbaCupTeamStats,
  "wins" | "losses" | "ppg" | "oppg" | "netRating"
  | "fgPct" | "fg3Pct" | "ftPct"
  | "rebPg" | "astPg" | "tovPg" | "stlPg" | "blkPg"
>;

interface ColDef {
  key:      SortKey;
  label:    string;
  title:    string;
  decimals: number;
  isPercent?: boolean;
  isSigned?:  boolean;
}

const COLS: ColDef[] = [
  { key: "wins",      label: "V",    title: "Victoires",               decimals: 0 },
  { key: "losses",    label: "D",    title: "Défaites",                decimals: 0 },
  { key: "ppg",       label: "PPM",  title: "Points marqués / match",  decimals: 1 },
  { key: "oppg",      label: "OPPM", title: "Points encaissés / match", decimals: 1 },
  { key: "netRating", label: "NET",  title: "Net Rating",              decimals: 1, isSigned: true },
  { key: "fgPct",     label: "FG%",  title: "% Tirs de terrain",       decimals: 1, isPercent: true },
  { key: "fg3Pct",    label: "3PT%", title: "% 3 points",              decimals: 1, isPercent: true },
  { key: "ftPct",     label: "LF%",  title: "% Lancers francs",        decimals: 1, isPercent: true },
  { key: "rebPg",     label: "REB",  title: "Rebonds / match",         decimals: 1 },
  { key: "astPg",     label: "PD",   title: "Passes / match",          decimals: 1 },
  { key: "stlPg",     label: "INT",  title: "Interceptions / match",   decimals: 1 },
  { key: "blkPg",     label: "CTR",  title: "Contres / match",         decimals: 1 },
  { key: "tovPg",     label: "BP",   title: "Balles perdues / match",  decimals: 1 },
];

function fmt(v: number, decimals: number, isPercent?: boolean, isSigned?: boolean): string {
  const val = isPercent ? v * 100 : v;
  const str = val.toFixed(decimals);
  return isSigned && val > 0 ? `+${str}` : str;
}

// ─── Page ─────────────────────────────────────────────────────

export default function NbaCupEquipesPage() {
  // Saison en cours, ou saison passée dans /archives/[saison]/…
  const viewed = useViewedSeason();
  const [data, setData]       = useState<NbaCupTeamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [conf, setConf]       = useState<"all" | "East" | "West">("all");

  useEffect(() => {
    fetch(`/api/nba-cup/equipes?season=${viewed}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [viewed]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const teams = (data?.teams ?? [])
    .filter((t) => conf === "all" || t.conference === conf)
    .sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      return sortDir === "desc" ? vb - va : va - vb;
    });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <NbaCupNavbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Stats équipes — NBA Cup</h1>
            {data?.season && (
              <p className="text-sm text-zinc-500 mt-0.5">Saison {data.season} · group play + knockout</p>
            )}
          </div>

          {/* Filtre conférence */}
          <div className="ml-auto flex items-center gap-1">
            {(["all", "West", "East"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setConf(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  conf === c
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {c === "all" ? "Toutes" : c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/40">
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
                <div className="flex-1 flex justify-around">
                  {Array.from({ length: 6 }, (_, j) => (
                    <div key={j} className="h-4 w-10 bg-zinc-800 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            Aucune donnée NBA Cup disponible pour cette saison.
          </div>
        ) : (
          <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-semibold uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-semibold uppercase tracking-wide">Équipe</th>
                  <th className="px-2 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wide text-center w-10">MJ</th>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      title={c.title}
                      onClick={() => handleSort(c.key)}
                      className={`px-2 py-3 text-xs font-semibold uppercase tracking-wide text-center cursor-pointer select-none transition-colors whitespace-nowrap ${
                        sortKey === c.key
                          ? "text-amber-400"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span className="inline-flex items-center gap-0.5 justify-center">
                        {c.label}
                        {sortKey === c.key && (
                          sortDir === "desc"
                            ? <ArrowDown className="h-3 w-3" />
                            : <ArrowUp   className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => {
                  const logo = getTeamLogo(t.abbreviation);
                  const net  = t.netRating;
                  return (
                    <tr
                      key={t.teamId}
                      className={`border-b border-zinc-800/40 last:border-0 hover:bg-zinc-800/30 transition-colors ${
                        i % 2 === 0 ? "bg-zinc-800/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-zinc-600 text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {logo ? (
                            <Image src={logo} alt={t.abbreviation} width={28} height={28} className="flex-shrink-0" unoptimized />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex-shrink-0"
                              style={{ background: t.primaryColor ?? "#3f3f46" }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-white leading-tight">
                              {t.city} <span className="font-black">{t.name}</span>
                            </p>
                            <p className="text-[10px] text-zinc-500">{t.conference}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center text-zinc-400 text-xs">{t.games}</td>
                      {COLS.map((c) => {
                        const v = t[c.key] as number;
                        const isActive = c.key === sortKey;
                        const netColor =
                          c.key === "netRating"
                            ? net > 0 ? "text-green-400" : net < 0 ? "text-red-400" : "text-zinc-400"
                            : "";
                        return (
                          <td
                            key={c.key}
                            className={`px-2 py-3 text-center tabular-nums ${
                              isActive
                                ? "font-bold text-white"
                                : netColor
                                  ? netColor
                                  : "text-zinc-400"
                            }`}
                          >
                            {fmt(v, c.decimals, c.isPercent, c.isSigned)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && teams.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-600">
            <span><span className="text-zinc-500 font-semibold">MJ</span> Matchs joués</span>
            <span><span className="text-zinc-500 font-semibold">PPM</span> Points marqués / match</span>
            <span><span className="text-zinc-500 font-semibold">OPPM</span> Points encaissés / match</span>
            <span><span className="text-zinc-500 font-semibold">NET</span> Différentiel points / match</span>
            <span className="flex items-center gap-0.5"><Minus className="h-2.5 w-2.5 text-green-500" /><span className="text-green-500 font-semibold">NET+</span> favori</span>
            <span className="flex items-center gap-0.5"><Minus className="h-2.5 w-2.5 text-red-500" /><span className="text-red-500 font-semibold">NET–</span> défavorisé</span>
          </div>
        )}
      </div>
    </div>
  );
}
