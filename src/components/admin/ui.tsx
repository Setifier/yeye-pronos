import type { LucideIcon } from "lucide-react";

/**
 * Éléments d'interface de l'admin (sans état : utilisables côté serveur et client).
 * Vert = OK, orange = à surveiller, rouge (#ff5050) = à corriger, bleu (#5096ff) = action / info.
 */

export type Tone = "ok" | "warn" | "error" | "info" | "neutral";

const TONES: Record<Tone, { text: string; bg: string; ring: string; dot: string; bar: string }> = {
  ok:      { text: "text-emerald-400", bg: "bg-emerald-400/10", ring: "ring-emerald-400/20", dot: "bg-emerald-400", bar: "bg-emerald-400" },
  warn:    { text: "text-amber-400",   bg: "bg-amber-400/10",   ring: "ring-amber-400/25",   dot: "bg-amber-400",   bar: "bg-amber-400" },
  error:   { text: "text-[#ff5050]",   bg: "bg-[#ff5050]/10",   ring: "ring-[#ff5050]/25",   dot: "bg-[#ff5050]",   bar: "bg-[#ff5050]" },
  info:    { text: "text-[#5096ff]",   bg: "bg-[#5096ff]/10",   ring: "ring-[#5096ff]/25",   dot: "bg-[#5096ff]",   bar: "bg-[#5096ff]" },
  neutral: { text: "text-zinc-400",    bg: "bg-zinc-800",       ring: "ring-zinc-700",       dot: "bg-zinc-500",    bar: "bg-zinc-500" },
};

export const tone = (t: Tone) => TONES[t];

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  icon: Icon,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            {Icon && <Icon className="h-4 w-4 text-zinc-500" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-4 sm:p-5" : ""}>{children}</div>
    </section>
  );
}

export function Badge({ tone: t = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  const c = TONES[t];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${c.bg} ${c.text}`}>
      {children}
    </span>
  );
}

export function Dot({ tone: t, pulse = false }: { tone: Tone; pulse?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${TONES[t].dot}`} />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${TONES[t].dot}`} />
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone: t,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl bg-zinc-950/50 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${t ? TONES[t].text : "text-white"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, max, tone: t = "info" }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full rounded-full transition-all ${TONES[t].bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800">
        <Icon className="h-5 w-5 text-zinc-500" />
      </span>
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs text-zinc-500">{children}</p>}
    </div>
  );
}
