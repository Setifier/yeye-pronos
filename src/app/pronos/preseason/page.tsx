"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Clock, Lock } from "lucide-react";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { SPECIAL_PRED_WINDOWS, MAX_POINTS, type PreseasonBetType } from "@/types/special-predictions";
import { fmtPts } from "@/lib/format";
import { formatCountdown } from "@/lib/game-night";
import { getSeasonLabel } from "@/types/season";
import { usePreseason } from "@/components/preseason/use-preseason";
import { formatDeadline } from "@/components/preseason/preseason-layout";

const ITEMS: { type: PreseasonBetType; href: string; hint: string }[] = [
  { type: "PRESEASON_NBA_STANDINGS",    href: "/pronos/preseason/classement", hint: "À faire en premier : ton top 10 prépare ton bracket" },
  { type: "PRESEASON_BRACKET",          href: "/pronos/preseason/bracket",    hint: "Play-in, playoffs, champion et MVP des Finales" },
  { type: "PRESEASON_NBA_CUP_CHAMPION", href: "/pronos/preseason/nba-cup",    hint: "Un seul choix, cote selon la saison passée" },
  { type: "PRESEASON_MVP_SEASON",       href: "/pronos/preseason/mvp",        hint: "Un seul choix" },
];

export default function PreseasonPage() {
  const { data, error, open, now } = usePreseason();
  const done = data ? ITEMS.filter((i) => data.predictions[i.type]).length : 0;
  const left = data ? new Date(data.deadline).getTime() - now : 0;

  return (
    <div className="min-h-screen bg-zinc-950 pb-12 text-white">
      <PronoseNavbar />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight">Paris de début de saison</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {data ? `Saison ${getSeasonLabel(data.season)} · ` : ""}4 paris à faire une fois, résultats en décembre (NBA Cup) et en fin de saison
          </p>
        </div>

        {data && (
          <div className={`mb-6 rounded-2xl border p-4 ${open ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-zinc-300">
                {open ? <Clock className="h-4 w-4 text-amber-400" /> : <Lock className="h-4 w-4 text-zinc-500" />}
                {open
                  ? <>Ouverts jusqu&apos;au <b className="text-white">{formatDeadline(data.deadline)}</b> · dans {formatCountdown(left)}</>
                  : <>Paris fermés depuis le {formatDeadline(data.deadline)}</>}
              </p>
              <p className="text-sm font-bold tabular-nums">{done}/4 <span className="font-normal text-zinc-500">faits</span></p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-[#5096ff] to-[#dcff50]" style={{ width: `${(done / 4) * 100}%` }} />
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="space-y-3">
          {ITEMS.map(({ type, href, hint }) => {
            const meta = SPECIAL_PRED_WINDOWS[type];
            const made = !!data?.predictions[type];
            return (
              <Link key={type} href={href}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
                {made ? <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-400" /> : <Circle className={`h-6 w-6 flex-shrink-0 ${open ? "text-[#ff5050]" : "text-zinc-700"}`} />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{meta.label}</p>
                  <p className="text-xs text-zinc-500">{hint}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`text-xs font-semibold ${made ? "text-green-400" : open ? "text-[#ff5050]" : "text-zinc-600"}`}>
                    {made ? "Fait" : open ? "À faire" : "Non joué"}
                  </p>
                  <p className="text-[11px] text-zinc-600">jusqu&apos;à {fmtPts(MAX_POINTS[type])} pts</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600 group-hover:text-zinc-400" />
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          Les points des paris de saison s&apos;ajoutent à ton total au classement. <Link href="/pronos/regles" className="text-zinc-400 hover:text-white">Voir les règles</Link>
        </p>
      </div>
    </div>
  );
}
