"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, Medal, Star, Target, Zap } from "lucide-react";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { SPECIAL_PRED_WINDOWS } from "@/types/special-predictions";
import { fmtPts } from "@/lib/format";

import { getCurrentSeason, getSeasonLabel } from "@/types/season";
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

// Paris des playoffs mis de côté : ils deviendront des événements créés depuis l'admin.
const PRESEASON_ITEMS: { type: keyof typeof SPECIAL_PRED_WINDOWS; href: string }[] = [
  { type: "PRESEASON_NBA_STANDINGS",    href: "/pronos/preseason/classement" },
  { type: "PRESEASON_BRACKET",          href: "/pronos/preseason/bracket"    },
  { type: "PRESEASON_NBA_CUP_CHAMPION", href: "/pronos/preseason/nba-cup"    },
  { type: "PRESEASON_MVP_SEASON",       href: "/pronos/preseason/mvp"        },
  { type: "PRESEASON_DPOY",             href: "/pronos/preseason/dpoy"       },
  { type: "PRESEASON_ROOKIE",           href: "/pronos/preseason/rookie"     },
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

// ─── Mobile ───────────────────────────────────────────────────────────────────

function MobileOverview({ stats, openCount }: { stats: MatchStats | null; openCount: number }) {
  const played = stats ? stats.won + stats.lost : 0;
  return (
    <div className="space-y-3 px-4 py-4 md:hidden">
      {/* Bilan */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-[#151a0a] p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#dcff50]/10 blur-3xl" />
        <p className="relative text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Paris de match · saison {getSeasonLabel(SEASON)}</p>
        {stats ? (
          <div className="relative mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-5xl font-black tabular-nums leading-none text-[#dcff50]">{fmtPts(stats.totalPoints)}</p>
              <p className="mt-1 text-xs text-zinc-500">points</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums text-white">{played ? `${Math.round(stats.winRate)}%` : "–"}</p>
              <p className="text-xs text-zinc-500">{stats.won}/{played} réussis</p>
            </div>
          </div>
        ) : (
          <div className="relative mt-2 h-14 animate-pulse rounded-2xl bg-zinc-800/60" />
        )}
        {stats && (
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <MiniStat icon={<Target className="h-4 w-4 text-[#5096ff]" />} value={stats.bonEcart} label="Écarts" />
            <MiniStat icon={<Star className="h-4 w-4 text-amber-400" />} value={stats.topScorer} label="Marqueurs" />
            <MiniStat icon={<Zap className="h-4 w-4 text-purple-300" />} value={stats.comboUltime} label="Combos" />
          </div>
        )}
      </section>

      {/* Les deux sortes de paris */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/pronos/matchs" className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 active:scale-[0.97] transition-transform">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5096ff]/15">
            <CalendarDays className="h-5 w-5 text-[#5096ff]" />
          </span>
          <div>
            <p className="font-black leading-tight">Mes paris de match</p>
            <p className="mt-0.5 text-xs text-zinc-500">Nuit par nuit</p>
          </div>
        </Link>
        <Link href="/pronos/preseason" className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 active:scale-[0.97] transition-transform">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15">
            <Medal className="h-5 w-5 text-amber-400" />
          </span>
          <div>
            <p className="font-black leading-tight">Paris de saison</p>
            <p className={`mt-0.5 text-xs ${openCount > 0 ? "font-semibold text-green-400" : "text-zinc-500"}`}>
              {openCount > 0 ? "Ouverts" : `${PRESEASON_ITEMS.length} paris · fermés`}
            </p>
          </div>
        </Link>
      </div>

      <Link href="/pronos/regles" className="flex items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 active:scale-[0.98] transition-transform">
        <BookOpen className="h-5 w-5 text-zinc-400" />
        <span className="flex-1 text-sm font-semibold">Règles et barème</span>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </Link>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-zinc-950/50 px-2.5 py-2">
      {icon}
      <div className="min-w-0">
        <p className="text-sm font-black tabular-nums leading-none">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-zinc-500">{label}</p>
      </div>
    </div>
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

  const openCount = PRESEASON_ITEMS.filter(
    (i) => betStatuses[i.type] === "open"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PronoseNavbar />

      <MobileOverview stats={stats} openCount={openCount} />

      <div className="max-w-3xl mx-auto px-4 py-8 hidden md:block">

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
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Paris de saison</p>
            {openCount > 0 && (
              <span className="text-[11px] text-green-400 font-medium">{openCount} ouvert{openCount > 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="space-y-3">

            {/* Début de saison */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Début de saison</p>
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

          </div>

        </div>

      </div>
    </div>
  );
}
