"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { TeamLogo } from "@/components/bets/team-logo";
import { PreseasonLayout } from "@/components/preseason/preseason-layout";
import { usePreseason, type PreseasonTeam } from "@/components/preseason/use-preseason";
import { fmtPts } from "@/lib/format";
import { getSeasonLabel } from "@/types/season";
import { NBA_CUP_POINTS, nbaCupChampionPoints } from "@/types/special-predictions";

export default function PreseasonNbaCupPage() {
  const { data, error, open, now, saving, save } = usePreseason();
  const pick = (data?.predictions.PRESEASON_NBA_CUP_CHAMPION?.data as { teamId?: string } | undefined)?.teamId ?? null;
  const picked = data?.teams.find((t) => t.id === pick) ?? null;

  // Groupes NBA Cup si connus, sinon par conférence
  const groups = useMemo(() => {
    if (!data) return [];
    const hasGroups = data.teams.some((t) => t.nbaCupGroup);
    const key = (t: PreseasonTeam) => (hasGroups ? t.nbaCupGroup ?? "Autres" : t.conference === "EAST" ? "Conférence Est" : "Conférence Ouest");
    const map = new Map<string, PreseasonTeam[]>();
    for (const t of data.teams) map.set(key(t), [...(map.get(key(t)) ?? []), t]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, teams]) => ({
      name: name.replace("East-", "Est · Groupe ").replace("West-", "Ouest · Groupe "),
      teams: teams.sort((a, b) => (a.nbaCupPoints ?? 0) - (b.nbaCupPoints ?? 0)),
    }));
  }, [data]);

  return (
    <PreseasonLayout
      title="Champion NBA Cup"
      subtitle="Choisis l'équipe qui remportera la NBA Cup en décembre. Plus ton choix est inattendu, plus il rapporte."
      season={data?.season}
      deadline={data?.deadline}
      open={open}
      now={now}
      saved={!!pick}
      loading={!data && !error}
      error={error}
    >
      {data && (
        <div className="space-y-6">
          {picked && (
            <div className="flex items-center gap-4 rounded-2xl border border-[#5096ff]/40 bg-[#5096ff]/10 p-4">
              <TeamLogo abbreviation={picked.abbreviation} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Ton choix</p>
                <p className="text-lg font-bold">{picked.city} {picked.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[#dcff50]">+{fmtPts(picked.nbaCupPoints ?? 0)}</p>
                <p className="text-[11px] text-zinc-500">pts si champion</p>
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Cote selon le bilan {getSeasonLabel(data.previousSeason)} : {fmtPts(NBA_CUP_POINTS.FIRST)} pts pour le meilleur, {fmtPts(nbaCupChampionPoints(30))} pts pour le moins bon.
            {open && " Tu peux changer jusqu'à la date limite."}
          </p>

          {groups.map((g) => (
            <section key={g.name}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{g.name}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.teams.map((t) => {
                  const selected = t.id === pick;
                  return (
                    <button
                      key={t.id}
                      disabled={!open || saving}
                      onClick={() => !selected && save("PRESEASON_NBA_CUP_CHAMPION", { teamId: t.id }, `${t.name} : choix enregistré`)}
                      className={`relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                        selected ? "border-[#5096ff] bg-[#5096ff]/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 disabled:hover:border-zinc-800"
                      }`}
                    >
                      <TeamLogo abbreviation={t.abbreviation} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{t.name}</span>
                        <span className="block text-[11px] text-zinc-500">{t.previousRecord ? `${t.previousRecord} en ${data.previousSeason}` : t.abbreviation}</span>
                      </span>
                      <span className="text-sm font-bold text-[#dcff50]">{fmtPts(t.nbaCupPoints ?? 0)}</span>
                      {selected && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-[#5096ff]" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </PreseasonLayout>
  );
}
