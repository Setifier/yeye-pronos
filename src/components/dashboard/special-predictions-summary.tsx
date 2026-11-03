"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { SPECIAL_PRED_WINDOWS } from "@/types/special-predictions";

type BetType = keyof typeof SPECIAL_PRED_WINDOWS;

const PRESEASON: { type: BetType; href: string }[] = [
  { type: "PRESEASON_NBA_CUP_CHAMPION", href: "/pronos/preseason/nba-cup" },
  { type: "PRESEASON_MVP_SEASON",       href: "/pronos/preseason/mvp" },
  { type: "PRESEASON_NBA_STANDINGS",    href: "/pronos/preseason/classement" },
  { type: "PRESEASON_BRACKET",          href: "/pronos/preseason/bracket" },
];

const POSTSEASON: { type: BetType; href: string }[] = [
  { type: "POSTSEASON_PLAYIN",          href: "/pronos/postseason/playin" },
  { type: "POSTSEASON_PLAYOFFS_R1",     href: "/pronos/postseason/playoffs-r1" },
  { type: "POSTSEASON_PLAYOFFS_R2",     href: "/pronos/postseason/playoffs-r2" },
  { type: "POSTSEASON_PLAYOFFS_CF",     href: "/pronos/postseason/playoffs-cf" },
  { type: "POSTSEASON_PLAYOFFS_FINALS", href: "/pronos/postseason/playoffs-finals" },
];

/**
 * Paris de saison : statuts identiques à /pronos/postseason (même API).
 * Les paris de présaison 2026-27 restent "Fermé" tant qu'ils ne sont pas configurés.
 */
export function SpecialPredictionsSummary() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/pronos/bet-status")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setStatuses)
      .catch(() => {});
  }, []);

  const openCount = [...PRESEASON, ...POSTSEASON].filter((i) => statuses[i.type] === "open").length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Trophy className="h-4 w-4 text-amber-400" />
          Paris de saison
        </h2>
        {openCount > 0 ? (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-400">{openCount} ouvert{openCount > 1 ? "s" : ""}</span>
        ) : (
          <Link href="/pronos/regles" className="text-[11px] text-zinc-500 hover:text-zinc-300">Règles</Link>
        )}
      </div>
      <Group title="Début de saison" href="/pronos/preseason" items={PRESEASON} statuses={statuses} />
      <Group title="Play-in & Playoffs" href="/pronos/postseason" items={POSTSEASON} statuses={statuses} />
    </section>
  );
}

function Group({ title, href, items, statuses }: {
  title: string; href: string; items: { type: BetType; href: string }[]; statuses: Record<string, string>;
}) {
  return (
    <div className="px-2 py-2">
      <Link href={href} className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300">
        {title} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
      {items.map(({ type, href: itemHref }) => {
        const open = statuses[type] === "open";
        return (
          <Link key={type} href={itemHref} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800/60">
            <span className="truncate text-sm text-zinc-300">{SPECIAL_PRED_WINDOWS[type].label.replace("Playoffs — ", "")}</span>
            <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              open ? "border border-green-500/20 bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-600"
            }`}>
              {open ? "Ouvert" : "Fermé"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
