"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { SPECIAL_PRED_WINDOWS } from "@/types/special-predictions";
import { fmtPts } from "@/lib/format";

import { getCurrentSeason } from "@/types/season";
const SEASON = getCurrentSeason();

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchStats {
  won: number;
  lost: number;
  winRate: number;
  bonEcart: number;
  topScorer: number;
  comboUltime: number;
  totalPoints: number;
}

type BetStatus = "locked" | "open";

type BetStatuses = Record<keyof typeof SPECIAL_PRED_WINDOWS, BetStatus>;

// ─── Config paris spéciaux ────────────────────────────────────────────────────

const PRESEASON_ITEMS: { type: keyof typeof SPECIAL_PRED_WINDOWS; href: string }[] = [
  { type: "PRESEASON_NBA_CUP_CHAMPION", href: "/pronos/preseason/nba-cup"   },
  { type: "PRESEASON_MVP_SEASON",       href: "/pronos/preseason/mvp"        },
  { type: "PRESEASON_NBA_STANDINGS",    href: "/pronos/preseason/classement" },
  { type: "PRESEASON_BRACKET",          href: "/pronos/preseason/bracket"    },
];

const POSTSEASON_ITEM_TYPES: { type: keyof typeof SPECIAL_PRED_WINDOWS; href: string }[] = [
  { type: "POSTSEASON_PLAYIN",          href: "/pronos/postseason/playin"          },
  { type: "POSTSEASON_PLAYOFFS_R1",     href: "/pronos/postseason/playoffs-r1"     },
  { type: "POSTSEASON_PLAYOFFS_R2",     href: "/pronos/postseason/playoffs-r2"     },
  { type: "POSTSEASON_PLAYOFFS_CF",     href: "/pronos/postseason/playoffs-cf"     },
  { type: "POSTSEASON_PLAYOFFS_FINALS", href: "/pronos/postseason/playoffs-finals" },
];

// ─── Mini stat card ───────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className={`text-xl font-black ${accent ? "text-[#dcff50]" : "text-white"}`}>
        {typeof value === "number" ? fmtPts(value) : value}
      </span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}

// ─── Ligne pari spécial ───────────────────────────────────────────────────────

function BetRow({ href, label, status }: { href: string; label: string; status: BetStatus }) {
  const badge = status === "open"
    ? { cls: "text-green-400 bg-green-500/10 border border-green-500/20", txt: "Ouvert" }
    : { cls: "text-zinc-600 bg-zinc-800", txt: "Fermé" };
  return (
    <Link href={href} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-800/60 transition-colors group">
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.txt}</span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PronosOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [betStatuses, setBetStatuses] = useState<Partial<BetStatuses>>({});

  useEffect(() => {
    fetch("/api/pronos?statsOnly=1")
      .then((r) => {
        if (r.status === 401) { router.push("/auth/login"); throw new Error(); }
        return r.json();
      })
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    fetch("/api/pronos/bet-status")
      .then((r) => r.json())
      .then((d) => setBetStatuses(d))
      .catch(() => {});
  }, []);

  const openCount = POSTSEASON_ITEM_TYPES.filter(
    (i) => betStatuses[i.type] === "open"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PronoseNavbar />

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Saison {SEASON} · tous les paris</p>
        </div>

        {/* Stats matchs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pronos matchs</p>
            <Link href="/pronos/matchs" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
              Voir les matchs →
            </Link>
          </div>
          {stats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill label="Points matchs" value={stats.totalPoints} accent />
                <StatPill label="Win rate" value={`${stats.winRate}%`} />
                <StatPill label="Gagnés" value={stats.won} />
                <StatPill label="Total pronos" value={stats.won + stats.lost} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <StatPill label="Bons écarts" value={`${stats.bonEcart}x`} />
                <StatPill label="Top scoreurs" value={`${stats.topScorer}x`} />
                <StatPill label="Combos ultimes" value={`${stats.comboUltime}x`} />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 h-16 animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* Paris spéciaux */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Paris spéciaux</p>
            {openCount > 0 && (
              <span className="text-[11px] text-green-400 font-medium">{openCount} ouvert{openCount > 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="space-y-3">

            {/* Présaison */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Présaison</p>
                <Link href="/pronos/preseason" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                  Voir →
                </Link>
              </div>
              <div className="px-1 py-1">
                {PRESEASON_ITEMS.map(({ type, href }) => (
                  <BetRow
                    key={type}
                    href={href}
                    label={SPECIAL_PRED_WINDOWS[type].label}
                    status={betStatuses[type] ?? "locked"}
                  />
                ))}
              </div>
            </div>

            {/* Postseason */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Saison / Postseason</p>
                <Link href="/pronos/postseason" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                  Voir →
                </Link>
              </div>
              <div className="px-1 py-1">
                {POSTSEASON_ITEM_TYPES.map(({ type, href }) => (
                  <BetRow
                    key={type}
                    href={href}
                    label={SPECIAL_PRED_WINDOWS[type].label}
                    status={betStatuses[type] ?? "locked"}
                  />
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
