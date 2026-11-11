"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { getCurrentSeason } from "@/types/season";

/**
 * Saison affichée par les pages NBA et pronos.
 * Hors archives : rien (= saison en cours). Dans /archives/[saison]/… : la saison passée choisie,
 * fournie par src/app/archives/[season]/layout.tsx. Les pages réutilisent leur code tel quel.
 */
const ArchiveSeasonContext = createContext<string | null>(null);

export function ArchiveSeasonProvider({ season, children }: { season: string; children: ReactNode }) {
  return <ArchiveSeasonContext.Provider value={season}>{children}</ArchiveSeasonContext.Provider>;
}

/** Saison passée consultée, ou null hors archives. */
export function useArchiveSeason(): string | null {
  return useContext(ArchiveSeasonContext);
}

/** Saison dont la page doit afficher les données : la saison archivée, sinon la saison en cours. */
export function useViewedSeason(): string {
  return useContext(ArchiveSeasonContext) ?? getCurrentSeason();
}

/** Lien interne qui reste dans la saison archivée : "/nba-cup/groupes" → "/archives/2025-26/nba-cup/groupes". */
export function useSeasonHref(): (path: string) => string {
  const archive = useContext(ArchiveSeasonContext);
  return useCallback((path: string) => (archive ? `/archives/${archive}${path}` : path), [archive]);
}
