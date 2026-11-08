/**
 * Informations des pages légales (/legal/*) : un seul endroit à mettre à jour.
 */

/** Date de dernière mise à jour affichée en bas des pages légales. */
export const LEGAL_UPDATED_AT = "3 novembre 2026";

/** Crédit de conception. L'éditeur reste un particulier, à titre non professionnel (LCEN art. 6-III-2). */
export const CREATOR = "Setifier D&D";

/** Hébergeur (LCEN art. 6) : coordonnées publiées par Vercel (vercel.com/legal/privacy-policy, juin 2026). */
export const HOST = {
  name:    "Vercel Inc.",
  address: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
  email:   "privacy@vercel.com",
  website: "https://vercel.com",
} as const;

/** Adresse de contact publique (variable CONTACT_EMAIL). null tant qu'elle n'est pas renseignée. */
export function getContactEmail(): string | null {
  return process.env.CONTACT_EMAIL?.trim() || null;
}
