"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Search, X } from "lucide-react";
import { toast } from "sonner";
import { setAwardResultAction } from "@/actions/admin/season-bets";
import { AWARD_KEYS, AWARD_LABELS, type AwardKey } from "@/types/special-predictions";
import type { AwardPlayer } from "@/lib/admin-data";
import { Badge } from "@/components/admin/ui";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const WHEN: Record<AwardKey, string> = {
  MVP:        "annoncé en mai",
  DPOY:       "annoncé en avril",
  ROOKIE:     "annoncé en avril",
  FINALS_MVP: "à la fin des Finales",
};

/** Saisie des vainqueurs des trophées : chaque enregistrement renote aussitôt les paris de saison. */
export function AwardResults({ awards, players, disabled }: {
  awards: Record<AwardKey, AwardPlayer | null>;
  players: AwardPlayer[];
  disabled?: boolean;
}) {
  return (
    <ul className="divide-y divide-zinc-800/80">
      {AWARD_KEYS.map((key) => (
        <AwardRow key={key} award={key} winner={awards[key]} players={players} disabled={disabled} />
      ))}
    </ul>
  );
}

function AwardRow({ award, winner, players, disabled }: {
  award: AwardKey;
  winner: AwardPlayer | null;
  players: AwardPlayer[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    return players.filter((p) => normalize(`${p.name} ${p.team ?? ""}`).includes(q)).slice(0, 8);
  }, [players, query]);

  const save = async (playerId: string | null, label: string) => {
    setBusy(true);
    try {
      const result = await setAwardResultAction(award, playerId);
      const updated = Number(result.summary.seasonBetsUpdated ?? 0);
      toast.success(`${label}${updated ? ` · ${updated} pari(s) mis à jour` : ""}`);
      setEditing(false);
      setQuery("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{AWARD_LABELS[award]}</p>
          <p className="text-xs text-zinc-500">
            {winner ? <>{winner.name}{winner.team ? ` · ${winner.team}` : ""}</> : `Pas encore saisi (${WHEN[award]})`}
          </p>
        </div>
        {winner ? <Badge tone="ok">Saisi</Badge> : <Badge>À saisir</Badge>}
        {!editing && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setEditing(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
          >
            <Pencil className="h-3.5 w-3.5" /> {winner ? "Changer" : "Saisir"}
          </button>
        )}
        {winner && !editing && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => save(null, `${AWARD_LABELS[award]} effacé`)}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-zinc-500 hover:bg-[#ff5050]/10 hover:text-[#ff5050] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Effacer
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom du joueur…"
                className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#5096ff] focus:outline-none"
              />
            </div>
            <button type="button" onClick={() => { setEditing(false); setQuery(""); }}
              className="h-9 rounded-lg px-3 text-xs text-zinc-400 hover:bg-zinc-800">
              Annuler
            </button>
          </div>
          {matches.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => save(p.id, `${AWARD_LABELS[award]} : ${p.name}`)}
                  className="flex w-full items-center justify-between gap-3 border-b border-zinc-800/60 px-3 py-2 text-left text-sm last:border-0 hover:bg-zinc-800/60 disabled:opacity-40"
                >
                  <span className="truncate text-zinc-200">{p.name}</span>
                  <span className="text-xs text-zinc-500">{p.team ?? ""}</span>
                </button>
              ))}
            </div>
          )}
          {busy && <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement et notation…</p>}
        </div>
      )}
    </li>
  );
}
