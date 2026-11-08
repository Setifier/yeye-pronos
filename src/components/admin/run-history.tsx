import { ChevronDown, History } from "lucide-react";
import { JOB_LABELS } from "@/lib/cron-runs";
import type { RunInfo } from "@/lib/admin-data";
import { formatDuration, formatParisDateTime } from "@/lib/admin-format";
import { Badge, Dot, EmptyState } from "@/components/admin/ui";
import { SummaryChips, ProblemList, LogBox } from "@/components/admin/job-details";

/** Derniers passages des tâches de mise à jour (CRON et lancements manuels), dépliables. */
export function RunHistory({ runs }: { runs: RunInfo[] }) {
  if (runs.length === 0) {
    return (
      <EmptyState icon={History} title="Aucun passage enregistré">
        Le prochain CRON (ou un lancement depuis cette page) apparaîtra ici.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80">
      {runs.map((run) => {
        const subject = typeof run.summary.game === "string" ? run.summary.game : typeof run.summary.night === "string" ? run.summary.night : null;
        return (
          <li key={run.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/40 sm:px-5 [&::-webkit-details-marker]:hidden">
                <Dot tone={run.ok ? "ok" : "warn"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-200">
                    {JOB_LABELS[run.job] ?? run.job}
                    {subject && <span className="text-zinc-500"> · {subject}</span>}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {formatParisDateTime(run.createdAt)} · {formatDuration(run.durationMs)}
                    {!run.ok && <span className="text-amber-400"> · {run.problems.length} point(s) à vérifier</span>}
                  </span>
                </span>
                <Badge tone={run.trigger === "cron" ? "neutral" : "info"}>{run.trigger === "cron" ? "Auto" : "Manuel"}</Badge>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 px-4 pb-4 sm:px-5">
                <SummaryChips summary={run.summary} />
                <ProblemList problems={run.problems} />
                <LogBox logs={run.logs} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
