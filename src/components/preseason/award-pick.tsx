"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { TeamLogo } from "@/components/bets/team-logo";
import { PreseasonLayout } from "@/components/preseason/preseason-layout";
import { usePreseason, type PreseasonPlayer } from "@/components/preseason/use-preseason";
import { fmtPts } from "@/lib/format";
import type { PlayerAwardType } from "@/types/special-predictions";

const PREVIEW = 30;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Pari « un joueur » (MVP, DPOY, Rookie) : chaque joueur affiche sa cote, favoris en premier. */
export function AwardPick({ type, title, subtitle, pickedLabel, listHint, emptyHint }: {
  type: PlayerAwardType;
  title: string;
  subtitle: string;
  /** « Ton MVP », « Ton DPOY »… */
  pickedLabel: string;
  /** Phrase sous la recherche quand elle est vide. */
  listHint: string;
  /** Aucun candidat (ex. draft pas encore renseignée). */
  emptyHint?: string;
}) {
  const { data, error, open, now, saving, save } = usePreseason({ players: true });
  const [query, setQuery] = useState("");

  const pick = (data?.predictions[type]?.data as { playerId?: string } | undefined)?.playerId ?? null;
  const teamById = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);

  // Candidats, favoris en premier (cote la plus basse), puis meilleurs marqueurs de la saison passée
  const candidates = useMemo(
    () => (data?.players ?? [])
      .filter((p) => p.odds[type] != null)
      .sort((a, b) => (a.odds[type]! - b.odds[type]!) || ((b.previousPpg ?? 0) - (a.previousPpg ?? 0)) || a.fullName.localeCompare(b.fullName)),
    [data, type]
  );
  const picked = candidates.find((p) => p.id === pick) ?? null;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return candidates.slice(0, type === "PRESEASON_ROOKIE" ? candidates.length : PREVIEW);
    return candidates.filter((p) => {
      const team = p.teamId ? teamById.get(p.teamId) : null;
      return normalize(p.fullName).includes(q) || (team && normalize(`${team.abbreviation} ${team.name} ${team.city}`).includes(q));
    }).slice(0, 60);
  }, [candidates, query, teamById, type]);

  const points = (p: PreseasonPlayer) => p.odds[type] ?? 0;

  return (
    <PreseasonLayout
      title={title}
      subtitle={subtitle}
      season={data?.season}
      deadline={data?.deadline}
      open={open}
      now={now}
      saved={!!pick}
      loading={!data && !error}
      error={error}
    >
      {data && (
        candidates.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-10 text-center text-sm text-zinc-500">
            {emptyHint ?? "Aucun joueur disponible pour le moment."}
          </p>
        ) : (
          <div className="space-y-4">
            {picked && (
              <div className="flex items-center gap-4 rounded-2xl border border-[#5096ff]/40 bg-[#5096ff]/10 p-4">
                {picked.headshot
                  ? <Image src={picked.headshot} alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-zinc-800 object-cover" />
                  : <span className="h-14 w-14 rounded-full bg-zinc-800" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wider text-zinc-400">{pickedLabel}</p>
                  <p className="truncate text-lg font-bold">{picked.fullName}</p>
                  <p className="text-xs text-zinc-500">{picked.teamId ? teamById.get(picked.teamId)?.name : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-[#dcff50]">+{fmtPts(points(picked))}</p>
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
            {!query && <p className="text-xs text-zinc-500">{listHint}</p>}

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
                    onClick={() => !selected && save(type, { playerId: p.id }, `${p.fullName} : choix enregistré`)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-default ${selected ? "bg-[#5096ff]/15" : "hover:bg-zinc-800/60"}`}
                  >
                    {p.headshot
                      ? <Image src={p.headshot} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-zinc-800 object-cover" />
                      : <span className="h-9 w-9 rounded-full bg-zinc-800" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.fullName}</span>
                      {team && <span className="block truncate text-[11px] text-zinc-500">{team.name}</span>}
                    </span>
                    {team && <TeamLogo abbreviation={team.abbreviation} size={22} />}
                    <span className="w-14 text-right text-sm font-bold tabular-nums text-[#dcff50]">+{fmtPts(points(p))}</span>
                    {selected ? <Check className="h-4 w-4 text-[#5096ff]" /> : <span className="w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </PreseasonLayout>
  );
}
