"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, X, RefreshCw, Stethoscope, Trophy, RotateCcw, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  runMorningUpdateAction,
  runInjuriesUpdateAction,
  recalculateStandingsAction,
  refreshNightAction,
  reprocessGameAction,
} from "@/actions/admin/maintenance";
import { JOB_LABELS, type JobResult } from "@/lib/cron-runs";
import { formatDuration } from "@/lib/admin-format";
import { SummaryChips, ProblemList, LogBox } from "@/components/admin/job-details";

export type JobKind = "morning" | "injuries" | "standings" | "night" | "reprocess";

const RUNNERS: Record<JobKind, (arg?: string) => Promise<JobResult>> = {
  morning:   () => runMorningUpdateAction(),
  injuries:  () => runInjuriesUpdateAction(),
  standings: () => recalculateStandingsAction(),
  night:     (arg) => refreshNightAction(arg ?? ""),
  reprocess: (arg) => reprocessGameAction(arg ?? ""),
};

const ICONS: Record<JobKind, LucideIcon> = {
  morning:   RefreshCw,
  injuries:  Stethoscope,
  standings: Trophy,
  night:     RefreshCw,
  reprocess: RotateCcw,
};

const VARIANTS = {
  primary:   "bg-[#5096ff] text-white hover:bg-[#5096ff]/90",
  secondary: "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
  ghost:     "text-[#5096ff] hover:bg-[#5096ff]/10",
} as const;

const SIZES = {
  md: "h-10 px-4 text-sm gap-2",
  sm: "h-8 px-3 text-xs gap-1.5",
} as const;

/** Bouton qui lance une tâche de mise à jour, puis affiche son résultat (utilisable depuis une page serveur). */
export function JobButton({
  kind,
  arg,
  label,
  confirm,
  variant = "secondary",
  size = "md",
}: {
  kind: JobKind;
  arg?: string;
  label: string;
  /** Demande un 2e clic avant de lancer (ex. « Retraiter ? »). */
  confirm?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "running">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<JobResult | null>(null);

  // Chrono pendant l'exécution
  useEffect(() => {
    if (state !== "running") return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state]);

  // La demande de confirmation expire au bout de 4 s
  useEffect(() => {
    if (state !== "confirm") return;
    const id = setTimeout(() => setState("idle"), 4000);
    return () => clearTimeout(id);
  }, [state]);

  const start = async () => {
    if (state === "running") return;
    if (confirm && state === "idle") {
      setState("confirm");
      return;
    }
    setState("running");
    setElapsed(0);
    try {
      const r = await RUNNERS[kind](arg);
      setResult(r);
      if (r.ok) toast.success(`${JOB_LABELS[r.job]} : terminé en ${formatDuration(r.durationMs)}`);
      else toast.warning(`${JOB_LABELS[r.job]} : ${r.problems.length} point(s) à vérifier`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setState("idle");
    }
  };

  const confirming = state === "confirm";
  const Icon = ICONS[kind];

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={state === "running"}
        className={`inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${SIZES[size]} ${
          confirming ? "bg-amber-400 text-zinc-950 hover:bg-amber-300" : VARIANTS[variant]
        }`}
      >
        {state === "running" ? (
          <Loader2 className={size === "sm" ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4 animate-spin"} />
        ) : (
          !confirming && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
        {state === "running" ? `En cours… ${elapsed} s` : confirming ? confirm : label}
      </button>
      {result && <JobResultDialog result={result} onClose={() => setResult(null)} />}
    </>
  );
}

/** Fenêtre de résultat d'une tâche. */
export function JobResultDialog({ result, onClose }: { result: JobResult; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="job-result-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {result.ok ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 shrink-0 text-amber-400" />
            )}
            <div className="min-w-0">
              <h2 id="job-result-title" className="truncate text-base font-bold text-white">{JOB_LABELS[result.job]}</h2>
              <p className="text-xs text-zinc-500">
                {result.ok ? "Terminé" : `${result.problems.length} point(s) à vérifier`} · {formatDuration(result.durationMs)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <SummaryChips summary={result.summary} />
          <ProblemList problems={result.problems} />
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-zinc-400 hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Afficher le journal ({result.logs.length} lignes)</span>
              <span className="hidden group-open:inline">Masquer le journal</span>
            </summary>
            <div className="mt-2">
              <LogBox logs={result.logs} />
            </div>
          </details>
        </div>
        <div className="border-t border-zinc-800/80 px-5 pt-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={onClose} className="h-11 w-full rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-700">
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
