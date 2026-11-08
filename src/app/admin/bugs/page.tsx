import Link from "next/link";
import type { Metadata } from "next";
import { Bug, PartyPopper } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getBugReports, type BugFilter } from "@/lib/admin-data";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { BugCard } from "@/components/admin/bug-card";

export const metadata: Metadata = { title: "Admin · Signalements" };

const TABS: { id: BugFilter; label: string }[] = [
  { id: "open",     label: "À traiter" },
  { id: "resolved", label: "Résolus" },
  { id: "all",      label: "Tous" },
];

export default async function AdminBugsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter: BugFilter = status === "resolved" || status === "all" ? status : "open";
  const data = await getBugReports(prisma, filter);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Signalements"
        description="Envoyés depuis le bouton « Signaler un bug » (aussi reçus par e-mail sur l’adresse de contact)"
      />

      {!data.ready ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          La table des signalements n’existe pas encore : lancer <code className="font-mono">npx prisma db push</code>.
        </div>
      ) : (
        <>
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={`/admin/bugs?status=${t.id}`}
                aria-current={filter === t.id ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === t.id ? "bg-[#5096ff]/15 text-[#5096ff]" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {t.label}
                <span className="tabular-nums opacity-70">{data.counts[t.id]}</span>
              </Link>
            ))}
          </div>

          {data.rows.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
              {filter === "open" ? (
                <EmptyState icon={PartyPopper} title="Rien à traiter">
                  Les nouveaux signalements arriveront ici et par e-mail.
                </EmptyState>
              ) : (
                <EmptyState icon={Bug} title="Aucun signalement" />
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {data.rows.map((b) => (
                <BugCard key={b.id} bug={b} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
