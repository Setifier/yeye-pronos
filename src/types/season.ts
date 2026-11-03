/**
 * Types liés aux saisons NBA
 */

// ============================================
// TYPES DE SAISON (3 phases)
// ============================================

/**
 * Les 3 catégories de matchs NBA dans une saison.
 * Correspond au champ `seasonType` (String) en base de données.
 *
 * ESPN season.type mapping :
 *   2 → Regular Season
 *   5 → Play-In Tournament
 *   3 → Playoffs
 */
export type SeasonType =
  | "Regular Season"
  | "Play-In Tournament"
  | "Playoffs";

export const SEASON_TYPES: Record<SeasonType, SeasonType> = {
  "Regular Season":    "Regular Season",
  "Play-In Tournament": "Play-In Tournament",
  "Playoffs":          "Playoffs",
};

export const SEASON_TYPE_LABELS: Record<SeasonType, string> = {
  "Regular Season":    "Saison régulière",
  "Play-In Tournament": "Play-In",
  "Playoffs":          "Playoffs",
};

export const SEASON_TYPE_COLORS: Record<SeasonType, string> = {
  "Regular Season":    "text-zinc-400",
  "Play-In Tournament": "text-[#dcff50]",
  "Playoffs":          "text-[#ff5050]",
};

export const SEASON_TYPE_BADGE_COLORS: Record<SeasonType, string> = {
  "Regular Season":    "bg-zinc-800 text-zinc-300",
  "Play-In Tournament": "bg-[#dcff50]/10 text-[#dcff50] border border-[#dcff50]/20",
  "Playoffs":          "bg-[#ff5050]/10 text-[#ff5050] border border-[#ff5050]/20",
};

// ============================================
// MAPPING ESPN → SeasonType
// ============================================

/**
 * Convertit le type de saison ESPN (number) vers notre SeasonType.
 *
 * ⚠️ ESPN type 1 = présaison et 4 = intersaison : on ne les importe pas.
 * Toujours filtrer avec `isTrackedESPNSeasonType()` AVANT d'appeler cette
 * fonction, sinon un match de présaison serait compté en saison régulière.
 */
export function mapESPNSeasonType(espnType: number): SeasonType {
  switch (espnType) {
    case 5:  return "Play-In Tournament";
    case 3:  return "Playoffs";
    default: return "Regular Season";
  }
}

/** Types ESPN importés en base : 2 (saison régulière), 3 (playoffs), 5 (play-in). */
export function isTrackedESPNSeasonType(espnType: number): boolean {
  return espnType === 2 || espnType === 3 || espnType === 5;
}

/**
 * ESPN identifie une saison par l'année où elle SE TERMINE.
 * 2027 → "2026-27"
 */
export function seasonFromESPNYear(espnYear: number): string {
  const startYear = espnYear - 1;
  return `${startYear}-${String(espnYear).slice(-2)}`;
}

// ============================================
// SAISON EN COURS
// ============================================

/** Première saison suivie par l'application (archives consultables). */
export const FIRST_APP_SEASON = "2025-26";

/**
 * Détermine la saison NBA en cours.
 * Octobre → Septembre = même saison (ex: Oct 2026 → Sep 2027 = "2026-27")
 */
export function getCurrentSeason(now: Date = new Date()): string {
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const seasonStartYear = month >= 9 ? year : year - 1;
  return `${seasonStartYear}-${(seasonStartYear + 1).toString().slice(-2)}`;
}

/** "2026-27" → 2026 */
export function getSeasonStartYear(season: string): number {
  return parseInt(season.split("-")[0], 10);
}

/** "2026-27" → "2026-2027" (affichage) */
export function getSeasonLabel(season: string): string {
  const start = getSeasonStartYear(season);
  return `${start}-${start + 1}`;
}

/** "2026-27" → "2025-26" */
export function getPreviousSeason(season: string): string {
  const start = getSeasonStartYear(season) - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/**
 * Bornes larges d'une saison, au format YYYY-MM-DD (dates US Eastern).
 * Du 1er octobre (présaison) au 30 juin (fin des Finales).
 * Les matchs de présaison sont ignorés à l'import grâce au type ESPN.
 */
export function getSeasonBounds(season: string): { start: string; end: string } {
  const start = getSeasonStartYear(season);
  return { start: `${start}-10-01`, end: `${start + 1}-06-30` };
}
