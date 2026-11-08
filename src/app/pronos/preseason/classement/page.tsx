"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, RotateCcw, Save, ArrowRight } from "lucide-react";
import { TeamLogo } from "@/components/bets/team-logo";
import { PreseasonLayout } from "@/components/preseason/preseason-layout";
import { usePreseason } from "@/components/preseason/use-preseason";
import { STANDINGS_POINTS, type StandingsPredictionData } from "@/types/special-predictions";
import { stableStringify } from "@/lib/preseason-bracket";

const LOWEST_BONUS = STANDINGS_POINTS.BONUS[STANDINGS_POINTS.BONUS.length - 1];

type Conf = "east" | "west";

export default function PreseasonClassementPage() {
  const { data, error, open, now, saving, save } = usePreseason();
  const [conf, setConf] = useState<Conf>("east");
  const [order, setOrder] = useState<StandingsPredictionData | null>(null);

  const saved = (data?.predictions.PRESEASON_NBA_STANDINGS?.data as StandingsPredictionData | undefined) ?? null;

  useEffect(() => {
    if (data && !order) setOrder(saved ?? data.defaults.standings);
  }, [data, saved, order]);

  const teamById = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);
  const dirty = !!order && stableStringify(order) !== stableStringify(saved);

  const move = (i: number, delta: number) => {
    if (!order || !open) return;
    const list = [...order[conf]];
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setOrder({ ...order, [conf]: list });
  };

  return (
    <PreseasonLayout
      title="Classement NBA"
      subtitle="Classe les 15 équipes de chaque conférence comme à la fin de la saison régulière."
      season={data?.season}
      deadline={data?.deadline}
      open={open}
      now={now}
      saved={!!saved}
      points={`${STANDINGS_POINTS.EXACT} pts par place exacte · ${STANDINGS_POINTS.ONE_OFF} à une place près · bonus dès ${LOWEST_BONUS.teams} places exactes`}
      loading={!data && !error}
      error={error}
    >
      {data && order && (
        <div className="space-y-4 pb-20">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-zinc-900 p-1 ring-1 ring-zinc-800">
              {(["east", "west"] as const).map((c) => (
                <button key={c} onClick={() => setConf(c)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${conf === c ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}>
                  {c === "east" ? "Est" : "Ouest"}
                </button>
              ))}
            </div>
            {open && (
              <button onClick={() => setOrder({ ...order, [conf]: data.defaults.standings[conf] })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <RotateCcw className="h-3.5 w-3.5" /> Ordre {data.previousSeason}
              </button>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            <span className="text-green-400">1 à 6</span> qualifiés · <span className="text-amber-400">7 à 10</span> Play-in · 11 à 15 éliminés.
            Ton top 10 sert de base à ton bracket.
          </p>

          <ol className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
            {order[conf].map((id, i) => {
              const t = teamById.get(id);
              if (!t) return null;
              const zone = i < 6 ? "text-green-400" : i < 10 ? "text-amber-400" : "text-zinc-600";
              return (
                <li key={id} className={`flex items-center gap-3 px-3 py-2 ${i === 5 || i === 9 ? "border-b-2 border-b-zinc-700" : ""}`}>
                  <span className={`w-6 text-center text-sm font-bold tabular-nums ${zone}`}>{i + 1}</span>
                  <TeamLogo abbreviation={t.abbreviation} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.city} {t.name}</span>
                    <span className="block text-[11px] text-zinc-500">{t.previousRecord ? `${t.previousRecord} en ${data.previousSeason}` : t.abbreviation}</span>
                  </span>
                  {open && (
                    <span className="flex gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"
                        className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === order[conf].length - 1} aria-label="Descendre"
                        className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {saved && !dirty && (
            <Link href="/pronos/preseason/bracket" className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-medium hover:bg-zinc-700">
              Compléter mon bracket <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {open && (
            <div className="fixed inset-x-0 bottom-16 z-20 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur md:bottom-0">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  {dirty ? "Modifications non enregistrées (Est + Ouest enregistrés ensemble)" : saved ? "Classement enregistré" : "Pas encore enregistré"}
                </span>
                <button
                  onClick={() => save("PRESEASON_NBA_STANDINGS", order, "Classement enregistré")}
                  disabled={saving || (!dirty && !!saved)}
                  className="flex items-center gap-2 rounded-xl bg-[#5096ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5096ff]/90 disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PreseasonLayout>
  );
}
