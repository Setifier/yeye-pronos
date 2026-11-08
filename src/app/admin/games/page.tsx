import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CalendarDays, CalendarX, CheckCircle2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminNight, type AdminGameRow } from "@/lib/admin-data";
import { formatParisTimeOnly } from "@/lib/admin-format";
import { Badge, Card, EmptyState, PageHeader, type Tone } from "@/components/admin/ui";
import { JobButton } from "@/components/admin/job-button";

export const metadata: Metadata = { title: "Admin · Matchs" };

const STATUS: Record<AdminGameRow["status"], { label: string; tone: Tone }> = {
  SCHEDULED: { label: "Programmé", tone: "neutral" },
  LIVE:      { label: "En direct", tone: "info" },
  FINAL:     { label: "Terminé",   tone: "neutral" },
  POSTPONED: { label: "Reporté",   tone: "warn" },
  CANCELLED: { label: "Annulé",    tone: "warn" },
};

const s = (n: number) => (n > 1 ? "s" : "");

function GameItem({ game: g }: { game: AdminGameRow }) {
  const status = STATUS[g.status];
  const final = g.status === "FINAL";
  const awayWon = final && (g.away.score ?? 0) > (g.home.score ?? 0);
  const p = g.predictions;

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <span className="w-12 shrink-0 text-xs tabular-nums text-zinc-500">{formatParisTimeOnly(g.gameDate)}</span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className={`font-bold ${final && !awayWon ? "text-zinc-500" : "text-white"}`}>{g.away.abbr}</span>
          <span className="font-bold tabular-nums text-white">{g.away.score ?? "–"}</span>
          <span className="text-zinc-600">@</span>
          <span className="font-bold tabular-nums text-white">{g.home.score ?? "–"}</span>
          <span className={`font-bold ${final && awayWon ? "text-zinc-500" : "text-white"}`}>{g.home.abbr}</span>
          {g.tag && <Badge tone="info">{g.tag}</Badge>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <Badge tone={status.tone}>{status.label}</Badge>
          {final &&
            (g.processed ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Traité
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#ff5050]">
                <Clock className="h-3.5 w-3.5" /> À traiter
              </span>
            ))}
          {final && <span>{g.boxScore > 0 ? `Box score : ${g.boxScore} joueurs` : "Pas de box score"}</span>}
          <span>
            {p.total} prono{s(p.total)}
            {g.processed && p.total > 0 && ` · ${p.won} ✓ · ${p.lost} ✗`}
            {g.processed && p.pending > 0 && <span className="text-[#ff5050]"> · {p.pending} en attente</span>}
          </span>
          {g.topScorer && <span className="text-zinc-400">Top : {g.topScorer}</span>}
        </div>
      </div>

      {final && (
        <div className="shrink-0">
          <JobButton kind="reprocess" arg={g.id} label="Retraiter" confirm="Retraiter ?" size="sm" />
        </div>
      )}
    </li>
  );
}

export default async function AdminGamesPage({ searchParams }: { searchParams: Promise<{ night?: string }> }) {
  const { night: requested } = await searchParams;
  const data = await getAdminNight(prisma, requested);

  const finished = data.games.filter((g) => g.status === "FINAL");
  const processed = finished.filter((g) => g.processed).length;
  const navBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matchs"
        description="Scores, pronos et box scores, nuit par nuit (date US, heures de Paris)"
        actions={<JobButton kind="night" arg={data.night} label="Mettre à jour cette nuit" variant="primary" />}
      />

      {data.issues.length > 0 && (
        <section className="rounded-2xl bg-[#ff5050]/10 p-4 ring-1 ring-[#ff5050]/25">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <AlertTriangle className="h-4 w-4 text-[#ff5050]" />
            Matchs à rattraper
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            « Lancer la mise à jour » (page Santé) les traite tous d’un coup. Sinon, ouvrez la nuit concernée.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.issues.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/admin/games?night=${i.night}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-900"
                >
                  <span className="font-semibold">{i.label}</span>
                  <span className="text-zinc-500">
                    {i.reason === "unprocessed" ? "terminé, pas traité" : "score pas à jour"} · {i.night}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Navigation entre les nuits */}
      <div className="flex items-center gap-2">
        <Link href={`/admin/games?night=${data.prev}`} aria-label="Nuit précédente" className={navBtn}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-center">
          <p className="truncate text-sm font-semibold text-white">{data.relative ?? data.label}</p>
          {data.relative && <p className="truncate text-xs text-zinc-500">{data.label}</p>}
        </div>
        <Link href={`/admin/games?night=${data.next}`} aria-label="Nuit suivante" className={navBtn}>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <Card
        title={`${data.games.length} match${s(data.games.length)}`}
        icon={CalendarDays}
        padded={false}
        action={finished.length > 0 ? <span className="text-xs text-zinc-500">{processed}/{finished.length} traité{s(processed)}</span> : undefined}
      >
        {data.games.length === 0 ? (
          <EmptyState icon={CalendarX} title="Pas de match cette nuit-là" />
        ) : (
          <ul className="divide-y divide-zinc-800/80">
            {data.games.map((g) => (
              <GameItem key={g.id} game={g} />
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs leading-relaxed text-zinc-600">
        « Retraiter » remet les pronos du match en attente, relit le score et le box score sur ESPN, puis recalcule
        points, moyennes et classement. À utiliser si un résultat semble faux.
      </p>
    </div>
  );
}
