/**
 * Lecture d'une liste d'adresses saisie à la main (invitations de l'admin).
 * Sans dépendance serveur : utilisée aussi par la fenêtre d'invitation pour le compteur en direct.
 */

/** Plafond par envoi : l'action tient largement dans les 60 s de Vercel Hobby. */
export const MAX_INVITES_PER_SEND = 20;

const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}$/i;

/** « a@x.com, B@y.fr ; c@z » → adresses valides (minuscules, sans doublon) + entrées refusées. */
export function parseEmailList(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.trim().replace(/^<|>$/g, "").toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (EMAIL_RE.test(p)) {
      if (!valid.includes(p)) valid.push(p);
    } else if (!invalid.includes(p)) {
      invalid.push(p);
    }
  }
  return { valid, invalid };
}
