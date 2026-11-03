/**
 * Utilitaires pour les postes des joueurs NBA.
 * L'API ESPN retourne uniquement G, F, C.
 * On normalise PG/SG → G, SF/PF → F, et on affiche en toutes lettres.
 */

/** Normalise une valeur brute (PG, SG, SF, PF, G, F, C) → G / F / C */
export function normalizePosition(pos: string | null | undefined): string | null {
  if (!pos) return null;
  const p = pos.toUpperCase().trim();
  if (p === "PG" || p === "SG" || p === "G") return "G";
  if (p === "SF" || p === "PF" || p === "F") return "F";
  if (p === "C") return "C";
  return pos; // valeur inconnue : on la conserve telle quelle
}

/** Retourne le libellé complet pour un poste normalisé (G/F/C) */
export function positionLabel(pos: string | null | undefined): string {
  if (!pos) return "";
  switch (pos.toUpperCase().trim()) {
    case "G": return "Guard";
    case "F": return "Forward";
    case "C": return "Center";
    default:  return pos;
  }
}
