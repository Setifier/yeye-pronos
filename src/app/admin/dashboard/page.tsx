import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle, Bug, CalendarDays, CheckCircle2, Database, History, Moon, RefreshCw, Sun, Users, XCircle,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getHealthOverview, type FixAction, type RunInfo } from "@/lib/admin-data";
import { formatAgo, formatDuration, formatParisTimeOnly } from "@/lib/admin-format";
import { Badge, Card, Dot, PageHeader, ProgressBar, StatTile, tone, type Tone } from "@/components/admin/ui";
import { JobButton, type JobKind } from "@/components/admin/job-button";
import { RunHistory } from "@/components/admin/run-history";
import { SummaryChips } from "@/components/admin/job-details";
import { InviteButton } from "@/components/admin/invite-button";

export const metadata: Metadata = { title: "Admin · Santé" };

const FIX: Record<FixAction, { kind: JobKind; label: string }> = {
  morning:   { kind: "morning",   label: "Lancer la mise à jour" },
  injuries:  { kind: "injuries",  label: "Mettre à jour les blessures" },
  standings: { kind: "standings", label: "Recalculer le classement" },
};

/** Heure de Paris d'un CRON planifié en UTC (suit l'heure d'été / d'hiver). */
function parisHour(utcHour: number): string {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);
  const hour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" })
    .formatToParts(d)
    .find((p) => p.type === "hour")?.value;
  return `${Number(hour)} h`;
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs font-semibold text-[#5096ff] hover:underline underline-offset-2">
      {children}
    </Link>
  );
}

function ScheduleRow({
  icon: Icon, title, hint, run, kind, chips,
}: {
  icon: LucideIcon; title: string; hint: string; run: RunInfo | null; kind: JobKind; chips: string[];
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-200">{title}</p>
            <p className="text-xs text-zinc-500">{hint}</p>
          </div>
        </div>
        <JobButton kind={kind} label="Lancer" size="sm" variant="ghost" />
      </div>
      {run ? (
        <div className="space-y-2 pl-6.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <Badge tone={run.ok ? "ok" : "warn"}>{run.ok ? "OK" : `${run.problems.length} à vérifier`}</Badge>
            <span className="text-zinc-400">{formatAgo(run.createdAt)}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400">{formatDuration(run.durationMs)}</span>
            {run.trigger === "admin" && <Badge tone="info">Manuel</Badge>}
          </div>
          <SummaryChips summary={run.summary} only={chips} />
        </div>
      ) : (
        <p className="pl-6.5 text-xs text-zinc-500">Pas encore de passage enregistré.</p>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const h = await getHealthOverview(prisma);

  const failing = h.checks.filter((c) => c.status !== "ok");
  const level: Tone = failing.some((c) => c.status === "error") ? "error" : failing.length > 0 ? "warn" : "ok";
  const VerdictIcon = level === "ok" ? CheckCircle2 : level === "warn" ? AlertTriangle : XCircle;
  const t = tone(level);
  const preseasonTone: Tone = h.players.preseasonComplete >= h.players.onboarded ? "ok" : "warn";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Santé de l’app"
        description={`Saison ${h.season} · état actuel de la base`}
        actions={
          <>
            <InviteButton />
            <JobButton kind="morning" label="Lancer la mise à jour" variant="primary" />
          </>
        }
      />

      {/* ── Verdict ── */}
      <section className={`rounded-2xl p-4 ring-1 sm:p-5 ${t.bg} ${t.ring}`}>
        <div className="flex items-start gap-3">
          <VerdictIcon className={`mt-0.5 h-6 w-6 shrink-0 ${t.text}`} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">
              {level === "ok" ? "Tout est à jour" : `${failing.length} point${failing.length > 1 ? "s" : ""} à vérifier`}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {level === "ok"
                ? h.lastMorning
                  ? `Dernière mise à jour ${formatAgo(h.lastMorning.createdAt)}. Rien à faire.`
                  : "Rien à faire."
                : "Le bouton à côté de chaque point règle la plupart des cas en un clic."}
            </p>
            {failing.length > 0 && (
              <ul className="mt-4 space-y-2">
                {failing.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 rounded-xl bg-zinc-950/60 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span className="mt-1.5"><Dot tone={c.status} /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-200">{c.label}</p>
                        <p className="text-xs text-zinc-400">{c.detail}</p>
                      </div>
                    </div>
                    {c.fix && <JobButton kind={FIX[c.fix].kind} label={FIX[c.fix].label} size="sm" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Mises à jour automatiques ── */}
        <Card title="Mises à jour automatiques" icon={RefreshCw}>
          <div className="space-y-4">
            <ScheduleRow
              icon={Sun}
              title={`Matin · ${parisHour(8)}`}
              hint="Scores, pronos, stats, classement, effectifs"
              run={h.lastMorning}
              kind="morning"
              chips={["gamesProcessed", "standingsTeams", "teamsOk", "injured"]}
            />
            <div className="border-t border-zinc-800/80" />
            <ScheduleRow
              icon={Moon}
              title={`Soir · ${parisHour(21)}`}
              hint="Blessures et effectifs, avant les matchs"
              run={h.lastInjuries}
              kind="injuries"
              chips={["teamsOk", "injured", "injuriesUpdated", "recovered"]}
            />
          </div>
        </Card>

        {/* ── Nuit en cours ── */}
        <Card
          title={h.night.relative ?? "Nuit en cours"}
          icon={CalendarDays}
          action={<CardLink href={`/admin/games?night=${h.night.date}`}>Voir les matchs →</CardLink>}
        >
          <p className="mb-3 text-xs text-zinc-500">{h.night.label}</p>
          {h.night.games === 0 ? (
            <p className="text-sm text-zinc-400">Pas de match cette nuit.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Matchs"
                  value={h.night.games}
                  hint={h.night.firstGameAt ? `1er à ${formatParisTimeOnly(h.night.firstGameAt)}` : undefined}
                />
                <StatTile label="Pronos" value={h.night.predictions} hint={`${h.night.finished}/${h.night.games} matchs terminés`} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Joueurs qui ont parié</span>
                  <span className="font-semibold tabular-nums text-zinc-200">{h.night.bettors}/{h.night.players}</span>
                </div>
                <ProgressBar value={h.night.bettors} max={h.night.players} />
              </div>
            </div>
          )}
        </Card>

        {/* ── Joueurs ── */}
        <Card title="Joueurs" icon={Users} action={<CardLink href="/admin/users">Gérer →</CardLink>}>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Inscrits" value={h.players.total} hint={`${h.players.verified} e-mail confirmé${h.players.verified > 1 ? "s" : ""}`} />
            <StatTile label="Actifs (7 j)" value={h.players.active7d} hint={`${h.players.onboarded} profil${h.players.onboarded > 1 ? "s" : ""} complété${h.players.onboarded > 1 ? "s" : ""}`} />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Paris de saison complets</span>
              <span className="font-semibold tabular-nums text-zinc-200">{h.players.preseasonComplete}/{h.players.onboarded}</span>
            </div>
            <ProgressBar value={h.players.preseasonComplete} max={h.players.onboarded} tone={preseasonTone} />
          </div>
        </Card>

        {/* ── Signalements ── */}
        <Card title="Signalements" icon={Bug} action={<CardLink href="/admin/bugs">Ouvrir →</CardLink>}>
          <div className="flex items-center gap-4">
            <p className={`text-4xl font-black tabular-nums ${h.openBugs > 0 ? "text-[#ff5050]" : "text-zinc-600"}`}>{h.openBugs}</p>
            <p className="text-sm text-zinc-400">
              {h.openBugs === 0
                ? "Aucun signalement à traiter."
                : `signalement${h.openBugs > 1 ? "s" : ""} à traiter`}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Contrôles détaillés ── */}
      <Card
        title="Contrôles des données"
        icon={Database}
        action={<JobButton kind="standings" label="Recalculer le classement" size="sm" variant="ghost" />}
      >
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {h.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <span className="mt-1.5"><Dot tone={c.status} /></span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">{c.label}</p>
                <p className="text-xs text-zinc-500">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Historique ── */}
      <Card title="Historique" icon={History} padded={false} action={<span className="text-xs text-zinc-500">15 derniers passages</span>}>
        <RunHistory runs={h.history} />
      </Card>
    </div>
  );
}
