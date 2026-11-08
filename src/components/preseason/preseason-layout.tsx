"use client";

import Link from "next/link";
import { Clock, Lock, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { formatCountdown } from "@/lib/game-night";
import { fmtPts } from "@/lib/format";
import { getSeasonLabel } from "@/types/season";
import { hasResult, type SavedPrediction } from "@/components/preseason/use-preseason";

export function formatDeadline(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}

/** Cadre commun des pages de paris de début de saison. */
export function PreseasonLayout({
  title, subtitle, season, deadline, open, now, saved, points, prediction, loading, error, children,
}: {
  title: string;
  subtitle: string;
  season?: string;
  deadline?: string;
  open: boolean;
  now: number;
  saved: boolean;
  points?: string;
  /** Pari enregistré : ses points s'affichent dès qu'il y en a. */
  prediction?: SavedPrediction | null;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  const left = deadline ? new Date(deadline).getTime() - now : 0;

  return (
    <div className="min-h-screen bg-zinc-950 pb-12 text-white">
      <PronoseNavbar />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/pronos/preseason" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Paris de début de saison
        </Link>

        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>
            {season && <p className="mt-0.5 text-xs text-zinc-600">Saison {getSeasonLabel(season)}{points ? ` · ${points}` : ""}</p>}
          </div>
          <span className={`mt-1 flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            open ? "border border-green-500/20 bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"
          }`}>
            {open ? "Ouvert" : "Fermé"}
          </span>
        </header>

        {deadline && (
          <div className={`mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
            open ? (left < 24 * 3600_000 ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/60") : "border-zinc-800 bg-zinc-900/60"
          }`}>
            <span className="flex items-center gap-2 text-zinc-300">
              {open ? <Clock className="h-4 w-4 text-amber-400" /> : <Lock className="h-4 w-4 text-zinc-500" />}
              {open ? <>Modifiable jusqu&apos;au <b className="text-white">{formatDeadline(deadline)}</b> · dans {formatCountdown(left)}</> : <>Paris fermés depuis le {formatDeadline(deadline)}</>}
            </span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${saved ? "text-green-400" : "text-[#ff5050]"}`}>
              {saved ? <><CheckCircle2 className="h-4 w-4" /> Pari enregistré</> : open ? "Pas encore parié" : "Pas de pari"}
            </span>
          </div>
        )}

        {hasResult(prediction) && <ResultBox prediction={prediction} />}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#5096ff]" /></div>
        ) : error ? (
          <p className="py-16 text-center text-zinc-400">{error}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/** Points gagnés, avec leur détail (pari noté, ou en cours de notation). */
function ResultBox({ prediction }: { prediction: SavedPrediction }) {
  const final = prediction.status === "GRADED";
  const lines = prediction.breakdown?.lines ?? [];
  return (
    <div className="mb-5 rounded-xl border border-[#dcff50]/25 bg-[#dcff50]/5 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-zinc-300">{final ? "Points gagnés" : "Points gagnés pour l'instant"}</span>
        <span className="text-lg font-black tabular-nums text-[#dcff50]">+{fmtPts(prediction.pointsEarned)}</span>
      </div>
      {lines.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-400">
          {lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-3">
              <span>{l.label}</span>
              <span className="tabular-nums">+{fmtPts(l.points)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
