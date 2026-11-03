"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { TeamLogo } from "@/components/bets/team-logo";
import { PreseasonLayout } from "@/components/preseason/preseason-layout";
import { usePreseason } from "@/components/preseason/use-preseason";
import { fmtPts } from "@/lib/format";

const PREVIEW = 30;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function PreseasonMvpPage() {
  const { data, error, open, now, saving, save } = usePreseason({ players: true });
  const [query, setQuery] = useState("");

  const pick = (data?.predictions.PRESEASON_MVP_SEASON?.data as { playerId?: string } | undefined)?.playerId ?? null;
  const teamById = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);
  const players = data?.players ?? [];
  const picked = players.find((p) => p.id === pick) ?? null;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return players.slice(0, PREVIEW);
    return players.filter((p) => {
      const team = p.teamId ? teamById.get(p.teamId) : null;
      return normalize(p.fullName).includes(q) || (team && normalize(`${team.abbreviation} ${team.name} ${team.city}`).includes(q));
    }).slice(0, 60);
  }, [players, query, teamById]);

  return (
    <PreseasonLayout
      title="MVP de la saison"
      subtitle="Choisis le joueur qui sera élu MVP de la saison régulière."
      season={data?.season}
      deadline={data?.deadline}
      open={open}
      now={now}
      saved={!!pick}
      points={data ? `${fmtPts(data.mvpPoints)} pts si juste` : undefined}
      loading={!data && !error}
      error={error}
    >
      {data && (
        <div className="space-y-4">
          {picked && (
            <div className="flex items-center gap-4 rounded-2xl border border-[#5096ff]/40 bg-[#5096ff]/10 p-4">
              {picked.headshot && <Image src={picked.headshot} alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-zinc-800 object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Ton MVP</p>
                <p className="truncate text-lg font-bold">{picked.fullName}</p>
                <p className="text-xs text-zinc-500">{picked.teamId ? teamById.get(picked.teamId)?.name : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[#dcff50]">+{fmtPts(data.mvpPoints)}</p>
                <p className="text-[11px] text-zinc-500">pts si élu</p>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un joueur ou une équipe…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#5096ff] focus:outline-none"
            />
          </div>
          {!query && <p className="text-xs text-zinc-500">Les {PREVIEW} meilleurs marqueurs de la saison {data.previousSeason} — cherche n&apos;importe quel joueur sous contrat.</p>}

          <div className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Aucun joueur trouvé</p>
            ) : filtered.map((p) => {
              const team = p.teamId ? teamById.get(p.teamId) : null;
              const selected = p.id === pick;
              return (
                <button
                  key={p.id}
                  disabled={!open || saving}
                  onClick={() => !selected && save("PRESEASON_MVP_SEASON", { playerId: p.id }, `${p.fullName} : choix enregistré`)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-default ${selected ? "bg-[#5096ff]/15" : "hover:bg-zinc-800/60"}`}
                >
                  {p.headshot ? (
                    <Image src={p.headshot} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-zinc-800 object-cover" />
                  ) : (
                    <span className="h-9 w-9 rounded-full bg-zinc-800" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.fullName}</span>
                    <span className="block text-[11px] text-zinc-500">
                      {p.previousPpg != null ? `${p.previousPpg.toFixed(1)} pts/m en ${data.previousSeason}` : "Rookie / nouveau"}
                      {p.ppg != null && p.games > 0 ? ` · ${p.ppg.toFixed(1)} cette saison` : ""}
                    </span>
                  </span>
                  {team && <TeamLogo abbreviation={team.abbreviation} size={22} />}
                  {selected && <Check className="h-4 w-4 text-[#5096ff]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PreseasonLayout>
  );
}
