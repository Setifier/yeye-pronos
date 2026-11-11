import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ArchiveNav } from "@/components/archives/archive-nav";
import { ArchiveSeasonProvider } from "@/components/archives/season-context";
import { getCurrentSeason } from "@/types/season";

/**
 * Une saison passée : barre de navigation (classement général, mes pronos, stats NBA) au-dessus de pages
 * qui réutilisent celles de la saison en cours, avec les données de cette saison (ArchiveSeasonProvider).
 */
export default async function ArchiveSeasonLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  if (!/^\d{4}-\d{2}$/.test(season)) notFound();
  if (season === getCurrentSeason()) redirect("/classement");

  return (
    <ArchiveSeasonProvider season={season}>
      <ArchiveNav season={season} />
      {children}
    </ArchiveSeasonProvider>
  );
}
