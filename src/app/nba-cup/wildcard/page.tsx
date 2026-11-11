"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";
import { NbaCupNavbar } from "@/components/layout/nba-cup-navbar";
import { useViewedSeason } from "@/components/archives/season-context";
import type { GroupData, TeamStanding, NbaCupApiResponse } from "@/app/api/nba-cup/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUAL_META: Record<string, { label: string; title: string; badgeClass: string; rowClass: string }> = {
  x:    { label: "x",   title: "Vainqueur de groupe",    badgeClass: "text-amber-400 font-bold",  rowClass: "bg-amber-500/5"  },
  wc:   { label: "wc",  title: "Wild Card",               badgeClass: "text-blue-400 font-bold",   rowClass: "bg-blue-500/5"   },
  ko:   { label: "ko",  title: "Qualifié",                badgeClass: "text-green-400 font-bold",  rowClass: "bg-green-500/5"  },
  "--": { label: "—",   title: "Wild card contention",    badgeClass: "text-zinc-500",             rowClass: ""               },
  o:    { label: "o",   title: "Éliminé",                 badgeClass: "text-zinc-700",             rowClass: ""               },
};

function buildConferenceRanking(groups: GroupData[]): Array<TeamStanding & { groupKey: string; groupLetter: string }> {
  const all = groups.flatMap((g) =>
    g.standings.map((s) => ({ ...s, groupKey: g.groupKey, groupLetter: g.group }))
  );
  // Sort: wins desc, point diff desc, total points desc
  return all.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });
}

// ─── Conference table ─────────────────────────────────────────────────────────

function ConferenceTable({ conf, groups }: { conf: "East" | "West"; groups: GroupData[] }) {
  const teams = buildConferenceRanking(groups);
  const confLabel = conf === "East" ? "Est" : "Ouest";

  // Qualification cut lines
  // Positions 1, 2, 3 = group winners → x
  // Position 4 = wild card → wc
  // Rest → eliminated

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-zinc-600" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Conférence {confLabel}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Col headers */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
          <span className="w-5 flex-shrink-0" />
          <span className="w-4 flex-shrink-0 text-[10px] text-zinc-600 text-center">#</span>
          <span className="w-5 flex-shrink-0" />
          <span className="w-7 flex-shrink-0 text-[10px] text-zinc-600 text-center">Grp</span>
          <span className="flex-1 text-[10px] text-zinc-600 uppercase tracking-wide">Équipe</span>
          <span className="w-6 text-[10px] text-zinc-600 text-center flex-shrink-0">W</span>
          <span className="w-6 text-[10px] text-zinc-600 text-center flex-shrink-0">L</span>
          <span className="w-8 text-[10px] text-zinc-600 text-center flex-shrink-0">J</span>
          <span className="w-12 text-[10px] text-zinc-600 text-right flex-shrink-0">Diff</span>
          <span className="w-14 text-[10px] text-zinc-600 text-right flex-shrink-0">Pts</span>
        </div>

        {/* Cut line above position 1 (group winners) */}
        {teams.map((s, i) => {
          const qual   = s.qualStatus ? QUAL_META[s.qualStatus] : null;
          const isQual = s.qualStatus === "x" || s.qualStatus === "wc" || s.qualStatus === "ko";
          const logo   = getTeamLogo(s.abbreviation);
          const diff   = s.pointDiff;

          // Separator lines
          const showWcCut    = i === 3;   // after 3 group winners, wildcard cut
          const showElimCut  = i === 4;   // after wildcard, elimination cut

          return (
            <div key={s.teamId}>
              {/* Visual separator for cut lines */}
              {showWcCut && (
                <div className="flex items-center gap-2 px-3 py-0.5 bg-blue-500/5 border-t border-blue-500/20">
                  <span className="text-[9px] text-blue-400/60">Wild Card — 1 place qualificative</span>
                </div>
              )}
              {showElimCut && (
                <div className="flex items-center gap-2 px-3 py-0.5 bg-red-500/5 border-t border-red-500/15">
                  <span className="text-[9px] text-red-400/40">Éliminés</span>
                </div>
              )}

              <div className={`flex items-center gap-2 px-3 py-2 ${i < teams.length - 1 ? "border-b border-zinc-800/40" : ""} ${qual?.rowClass ?? ""}`}>
                {/* Qual badge */}
                <span
                  title={qual?.title}
                  className={`w-5 text-[9px] text-right flex-shrink-0 ${qual?.badgeClass ?? "text-zinc-800"}`}
                >
                  {qual?.label ?? ""}
                </span>

                {/* Rank */}
                <span className={`w-4 text-[11px] font-bold text-center flex-shrink-0 ${isQual ? "text-zinc-300" : "text-zinc-700"}`}>
                  {i + 1}
                </span>

                {/* Logo */}
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {logo ? (
                    <Image src={logo} alt={s.abbreviation} width={18} height={18} className="object-contain" />
                  ) : (
                    <div className="w-4 h-4 rounded bg-zinc-800" />
                  )}
                </div>

                {/* Group letter */}
                <span className="w-7 text-[10px] font-bold text-zinc-600 text-center flex-shrink-0">
                  Grp {s.groupLetter}
                </span>

                {/* Abbreviation */}
                <span className={`flex-1 text-xs font-semibold truncate ${
                  s.qualStatus === "o" ? "text-zinc-600" : isQual ? "text-white" : "text-zinc-300"
                }`}>
                  {s.abbreviation}
                  <span className={`ml-1.5 text-[10px] font-normal ${isQual ? "text-zinc-500" : "text-zinc-700"}`}>
                    {s.city}
                  </span>
                </span>

                <span className={`w-6 text-xs font-mono text-center flex-shrink-0 ${isQual ? "text-zinc-200" : "text-zinc-500"}`}>{s.wins}</span>
                <span className="w-6 text-xs font-mono text-center flex-shrink-0 text-zinc-600">{s.losses}</span>
                <span className="w-8 text-[11px] font-mono text-center flex-shrink-0 text-zinc-600">{s.gamesPlayed}</span>
                <span className={`w-12 text-[11px] font-mono text-right flex-shrink-0 ${diff > 0 ? "text-green-500/70" : diff < 0 ? "text-red-500/70" : "text-zinc-600"}`}>
                  {diff > 0 ? `+${diff}` : diff}
                </span>
                <span className="w-14 text-[11px] font-mono text-right flex-shrink-0 text-zinc-500">{s.pointsFor}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 flex-wrap px-1">
        {Object.entries(QUAL_META)
          .filter(([k]) => ["x", "wc", "--", "o"].includes(k))
          .map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`text-[9px] ${v.badgeClass}`}>{v.label}</span>
              <span className="text-[9px] text-zinc-600">{v.title}</span>
            </span>
          ))}
      </div>
    </section>
  );
}

// ─── Tiebreaker rules card ────────────────────────────────────────────────────

function TiebreakerRules() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Règles de départage</p>
      <ol className="space-y-1">
        {[
          "Bilan face-à-face dans la phase de groupes",
          "Différentiel de points (total DIFF) dans la phase de groupes",
          "Points marqués (total PTS) dans la phase de groupes",
          "Bilan saison régulière de l'année précédente",
        ].map((rule, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-zinc-600 flex-shrink-0 mt-0.5">{i + 1}.</span>
            <span className="text-[11px] text-zinc-500">{rule}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NbaCupWildcardPage() {
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
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">NBA Cup — Wild Card</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{data ? `Saison ${data.season} · 4 équipes qualifiées par conférence` : "Chargement…"}</p>
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>}
        {error   && <p className="text-sm text-zinc-500 py-10 text-center">Erreur de chargement.</p>}

        {data && (
          <>
            <TiebreakerRules />
            <div className="space-y-8">
              {(["East", "West"] as const).map((conf) => (
                <ConferenceTable
                  key={conf}
                  conf={conf}
                  groups={data.groups[conf]}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
