import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Domaines e-mail acceptés à l'inscription (bloque les adresses jetables).
 * Ajouter des domaines sans redéployer le code : variable ALLOWED_EMAIL_DOMAINS="a.com;b.fr".
 */
const DEFAULT_EMAIL_DOMAINS = [
  // Internationaux
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "ymail.com",
  "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr", "msn.com",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "gmx.com", "gmx.fr", "aol.com",
  // Fournisseurs français
  "free.fr", "orange.fr", "wanadoo.fr", "sfr.fr", "neuf.fr", "bbox.fr", "laposte.net", "numericable.fr",
];

export function getValidDomains() {
  const extra = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(";")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const domains = [...DEFAULT_EMAIL_DOMAINS, ...extra];
  if (process.env.NODE_ENV === "development") domains.push("example.com");
  return domains;
}

/**
 * Nettoie un nom : espaces superflus, caractères non autorisés, majuscule à chaque mot.
 * Conserve les accents (é, ï, ç…) — l'ancienne version supprimait toute lettre non ASCII.
 */
// Construite à l'exécution : la syntaxe \p{L} n'est pas acceptée par TypeScript avec la cible ES2017
const NOT_A_NAME_CHAR = new RegExp("[^\\p{L}\\s'-]", "gu");

export function normalizeName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(NOT_A_NAME_CHAR, "")
    .split(/([\s'-])/)
    .map((part) => (part.length > 0 ? part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1) : part))
    .join("")
    .trim();
}
