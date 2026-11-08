import type { Metadata } from "next";
import { AlertTriangle, Medal, ListChecks, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSeasonBetsOverview } from "@/lib/admin-data";
import { formatParisDateTime } from "@/lib/admin-format";
import { fmtPts } from "@/lib/format";
import { getSeasonLabel } from "@/types/season";
import { Badge, Card, PageHeader, type Tone } from "@/components/admin/ui";
import { JobButton } from "@/components/admin/job-button";
import { AwardResults } from "@/components/admin/award-results";

export const metadata: Metadata = { title: "Admin · Paris de saison" };

export default async function AdminSeasonBetsPage() {
  const o = await getSeasonBetsOverview(prisma);
  const r = o.results;

  const auto: { label: string; value: string; tone: Tone; when: string }[] = [
    {
      label: "Champion NBA Cup",
      value: r.nbaCupChampion ?? "En attente",
      tone:  r.nbaCupChampion ? "ok" : "neutral",
      when:  "après la finale, en décembre",
    },
    {
      label: "Classement final",
      value: r.standingsKnown ? "Connu" : "En attente",
      tone:  r.standingsKnown ? "ok" : "neutral",
      when:  "à la fin de la saison régulière, mi-avril",
    },
    {
      label: "Play-in",
      value: `${r.playinKnown}/2 conférences`,
      tone:  r.playinKnown === 2 ? "ok" : "neutral",
      when:  "dès que le 1er tour est formé",
    },
    {
      label: "Séries de playoffs",
      value: `${r.seriesDone}/15 terminées`,
      tone:  r.seriesDone === 15 ? "ok" : "neutral",
      when:  "tour par tour, d'avril à juin",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paris de saison"
        description={`Saison ${getSeasonLabel(o.season)} · ${o.open ? `paris ouverts jusqu'au ${formatParisDateTime(o.deadline)}` : `paris fermés depuis le ${formatParisDateTime(o.deadline)}`}. Les points se mettent à jour chaque matin.`}
        actions={<JobButton kind="seasonBets" label="Recalculer les points" variant="primary" />}
      />

      {o.unmatched.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Joueurs des classements de référence introuvables dans la base (ils valent 1 000 pts au lieu de leur rang) :{" "}
            <b>{o.unmatched.join(", ")}</b>. Corriger leur nom dans <code className="font-mono">AWARD_RANKINGS</code> (src/lib/award-odds.ts).
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Résultats automatiques" icon={Trophy} padded={false}>
          <ul className="divide-y divide-zinc-800/80">
            {auto.map((a) => (
              <li key={a.label} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{a.label}</p>
                  <p className="text-xs text-zinc-500">{a.when}</p>
                </div>
                <Badge tone={a.tone}>{a.value}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Trophées à saisir" icon={Medal} padded={false}>
          {!o.ready ? (
            <p className="px-4 py-4 text-sm text-amber-200 sm:px-5">
              La table des trophées n&apos;existe pas encore : lancer <code className="font-mono">npx prisma db push</code>.
            </p>
          ) : (
            <AwardResults awards={r.awards} players={o.players} />
          )}
        </Card>
      </div>

      <Card title="Paris" icon={ListChecks} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2.5 font-medium sm:px-5">Pari</th>
                <th className="px-3 py-2.5 text-right font-medium">Joués</th>
                <th className="px-3 py-2.5 text-right font-medium">Notés</th>
                <th className="px-4 py-2.5 text-right font-medium sm:px-5">Points donnés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {o.bets.map((b) => (
                <tr key={b.type}>
                  <td className="px-4 py-2.5 text-zinc-200 sm:px-5">{b.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{b.count}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{b.graded}/{b.count}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#dcff50] sm:px-5">{fmtPts(b.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
