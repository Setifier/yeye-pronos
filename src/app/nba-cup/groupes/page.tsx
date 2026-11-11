"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";
import { NbaCupNavbar } from "@/components/layout/nba-cup-navbar";
import { useViewedSeason } from "@/components/archives/season-context";
import type { GroupData, TeamStanding, NbaCupApiResponse } from "@/app/api/nba-cup/route";

// ─── Qual badge ───────────────────────────────────────────────────────────────

const QUAL_META: Record<string, { label: string; title: string; className: string }> = {
  x:   { label: "x",   title: "Vainqueur de groupe",  className: "text-amber-400 font-bold" },
  wc:  { label: "wc",  title: "Wild Card",             className: "text-blue-400 font-bold"  },
  ko:  { label: "ko",  title: "Qualifié",              className: "text-green-400 font-bold" },
  "--": { label: "—",  title: "Wild card contention",  className: "text-zinc-500"            },
  o:   { label: "o",   title: "Éliminé",               className: "text-zinc-700"            },
};

// ─── Team row ─────────────────────────────────────────────────────────────────

function TeamRow({ standing, rank }: { standing: TeamStanding; rank: number }) {
  const logo   = getTeamLogo(standing.abbreviation);
  const isQual = standing.qualStatus === "x" || standing.qualStatus === "wc" || standing.qualStatus === "ko";
  const qual   = standing.qualStatus ? QUAL_META[standing.qualStatus] : null;
  const diff   = standing.pointDiff;

  return (
    <div className={`flex items-center gap-2 px-3 py-[7px] ${rank < 5 ? "border-b border-zinc-800/40" : ""} ${isQual ? "bg-amber-500/4" : ""}`}>
      {/* Qual status */}
      <span
        title={qual?.title}
        className={`w-4 text-[9px] text-right flex-shrink-0 ${qual?.className ?? "text-zinc-800"}`}
      >
        {qual?.label ?? ""}
      </span>

      {/* Rank */}
      <span className={`w-4 text-[11px] font-bold text-center flex-shrink-0 ${isQual ? "text-zinc-400" : "text-zinc-700"}`}>
        {rank}
      </span>

      {/* Logo */}
      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
        {logo ? (
          <Image src={logo} alt={standing.abbreviation} width={18} height={18} className="object-contain" />
        ) : (
          <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center">
            <span className="text-[7px] font-bold text-zinc-500">{standing.abbreviation.slice(0, 2)}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <span className={`flex-1 text-xs font-semibold truncate ${
        standing.qualStatus === "o" ? "text-zinc-600" : isQual ? "text-white" : "text-zinc-300"
      }`}>
        {standing.abbreviation}
      </span>

      <span className="text-xs font-mono w-5 text-center flex-shrink-0 text-zinc-300">{standing.wins}</span>
      <span className="text-xs font-mono w-5 text-center flex-shrink-0 text-zinc-600">-</span>
      <span className="text-xs font-mono w-5 text-center flex-shrink-0 text-zinc-500">{standing.losses}</span>
      <span className="text-[11px] font-mono w-10 text-right flex-shrink-0">
        <span className={diff > 0 ? "text-green-500/70" : diff < 0 ? "text-red-500/70" : "text-zinc-600"}>
          {diff > 0 ? `+${diff}` : diff}
        </span>
      </span>
    </div>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({ group }: { group: GroupData }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
          Groupe {group.group}
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto">Conf. {group.conference === "East" ? "Est" : "Ouest"}</span>
      </div>

      {/* Col headers */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/50">
        <span className="w-4 flex-shrink-0" />
        <span className="w-4 flex-shrink-0" />
        <span className="w-5 flex-shrink-0" />
        <span className="flex-1 text-[10px] text-zinc-600 uppercase tracking-wide">Équipe</span>
        <span className="text-[10px] text-zinc-600 w-5 text-center flex-shrink-0">W</span>
        <span className="w-5 flex-shrink-0" />
        <span className="text-[10px] text-zinc-600 w-5 text-center flex-shrink-0">L</span>
        <span className="text-[10px] text-zinc-600 w-10 text-right flex-shrink-0">Diff</span>
      </div>

      {group.standings.map((s, i) => (
        <TeamRow key={s.teamId} standing={s} rank={i + 1} />
      ))}

      {/* Legend */}
      <div className="px-3 py-1.5 border-t border-zinc-800/40 flex items-center gap-4 flex-wrap">
        {Object.entries(QUAL_META)
          .filter(([k]) => k !== "ko" && k !== "--")
          .map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`text-[9px] ${v.className}`}>{v.label}</span>
              <span className="text-[9px] text-zinc-700">{v.title}</span>
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NbaCupGroupesPage() {
  // Saison en cours, ou saison passée dans /archives/[saison]/…
  const viewed = useViewedSeason();
  const [data,    setData]    = useState<NbaCupApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/nba-cup?season=${viewed}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<NbaCupApiResponse>; })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [viewed]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <NbaCupNavbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">NBA Cup — Groupes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{data ? `Saison ${data.season}` : "Chargement…"}</p>
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>}
        {error   && <p className="text-sm text-zinc-500 py-10 text-center">Erreur de chargement.</p>}

        {data && (
          <div className="space-y-8">
            {(["East", "West"] as const).map((conf) => (
              <section key={conf}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Conférence {conf === "East" ? "Est" : "Ouest"}
                  </span>
                </div>
                {data.groups[conf].length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {data.groups[conf].map((g) => (
                      <GroupCard key={g.groupKey} group={g} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
      <p className="text-sm text-zinc-600">Données non disponibles</p>
      <p className="text-xs text-zinc-700 mt-1">Lance <code className="text-zinc-500">npm run db:backfill-nba-cup</code></p>
    </div>
  );
}
