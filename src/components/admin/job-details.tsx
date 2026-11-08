import { AlertTriangle } from "lucide-react";
import { SUMMARY_LABELS } from "@/lib/cron-runs";

/** Compteurs d'une tâche : « 8 matchs traités », « 93 blessés »… */
export function SummaryChips({ summary, only }: { summary: Record<string, number | string>; only?: string[] }) {
  const entries = Object.entries(summary).filter(([k]) => !only || only.includes(k));
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, value]) =>
        typeof value === "string" ? (
          <span key={key} className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-200">
            {value}
          </span>
        ) : (
          <span key={key} className="rounded-md bg-zinc-800/70 px-2 py-0.5 text-xs text-zinc-400">
            <span className="font-semibold tabular-nums text-zinc-200">{value}</span> {SUMMARY_LABELS[key] ?? key}
          </span>
        )
      )}
    </div>
  );
}

/** Points d'attention d'une tâche. */
export function ProblemList({ problems }: { problems: string[] }) {
  if (problems.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {problems.map((p, i) => (
        <li key={i} className="flex gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

/** Journal brut d'une tâche. */
export function LogBox({ logs }: { logs: string[] }) {
  if (logs.length === 0) return <p className="text-xs text-zinc-600">Journal vide.</p>;
  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">
      {logs.join("\n")}
    </pre>
  );
}
