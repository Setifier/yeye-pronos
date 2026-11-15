"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setCoachOfYearAction } from "@/actions/admin/nba-awards";
import { JobButton } from "@/components/admin/job-button";
import { getSeasonLabel } from "@/types/season";

export interface CoachEntry {
  name: string;
  teamAbbr: string | null;
}

/**
 * Admin → Paris de saison → Trophées NBA : état de la saison, récupération ESPN (saison en cours et
 * saisons passées), entraîneur de l'année à saisir (ESPN ne le publie pas).
 */
export function NbaAwardsAdmin({ season, decided, total, pastSeasons, teams, coaches }: {
  season: string;
  decided: number;
  total: number;
  pastSeasons: string[];
  teams: { abbreviation: string; name: string }[];
  coaches: Record<string, CoachEntry | null>;
}) {
  const router = useRouter();
  const seasons = [season, ...pastSeasons];
  const [target, setTarget] = useState(season);
  const [name, setName] = useState(coaches[season]?.name ?? "");
  const [team, setTeam] = useState(coaches[season]?.teamAbbr ?? "");
  const [saving, setSaving] = useState(false);

  const pick = (s: string) => {
    setTarget(s);
    setName(coaches[s]?.name ?? "");
    setTeam(coaches[s]?.teamAbbr ?? "");
  };

  const save = async (clear = false) => {
    setSaving(true);
    const res = await setCoachOfYearAction(target, clear ? "" : name, clear ? null : team || null)
      .catch(() => ({ ok: false as const, error: "Enregistrement impossible." }));
    setSaving(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (clear) { setName(""); setTeam(""); }
    toast.success(clear ? "Entraîneur de l'année effacé" : "Entraîneur de l'année enregistré");
    router.refresh();
  };

  const saved = coaches[target];

  return (
    <div className="divide-y divide-zinc-800/80">
      {/* État + ESPN */}
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-300">
            Saison {getSeasonLabel(season)} : <b className="text-white">{decided}/{total}</b> trophées décernés
          </p>
          <Link href="/trophees" className="inline-flex items-center gap-1 text-xs font-semibold text-[#5096ff] hover:underline">
            Voir la page <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          Récupérés chaque jour à midi sur ESPN pendant les annonces (déc., fév., avril → juillet). Les trophées des
          paris (MVP, DPOY, Rookie, MVP des Finales) sont reportés ci-dessus s&apos;ils ne sont pas déjà saisis.
        </p>
        <div className="flex flex-wrap gap-2">
          <JobButton kind="awards" label="Récupérer sur ESPN" size="sm" />
          {pastSeasons.map((s) => (
            <JobButton key={s} kind="awards" arg={s} label={`Saison ${getSeasonLabel(s)}`} size="sm" variant="ghost" />
          ))}
        </div>
      </div>

      {/* Entraîneur de l'année */}
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-white">Entraîneur de l&apos;année</p>
          <p className="text-xs text-zinc-500">Pas publié par ESPN : à saisir à l&apos;annonce (avril).</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
          <select
            value={target}
            onChange={(e) => pick(e.target.value)}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
            aria-label="Saison"
          >
            {seasons.map((s) => <option key={s} value={s}>{getSeasonLabel(s)}</option>)}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'entraîneur"
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder:text-zinc-600"
          />
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
            aria-label="Équipe"
          >
            <option value="">Équipe…</option>
            {teams.map((t) => <option key={t.abbreviation} value={t.abbreviation}>{t.abbreviation} · {t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || name.trim().length < 3}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5096ff] px-3 text-xs font-semibold text-white hover:bg-[#5096ff]/90 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enregistrer
          </button>
          {saved && (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="h-9 rounded-lg px-3 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
            >
              Effacer
            </button>
          )}
          <span className="text-xs text-zinc-500">
            {saved ? <>Enregistré : <b className="text-zinc-300">{saved.name}</b>{saved.teamAbbr ? ` (${saved.teamAbbr})` : ""}</> : "Rien d'enregistré pour cette saison"}
          </span>
        </div>
      </div>
    </div>
  );
}
