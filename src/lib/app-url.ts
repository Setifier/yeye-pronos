/**
 * URL de l'app, pour qu'une page serveur appelle sa propre API.
 * BETTER_AUTH_URL d'abord : obligatoire en prod (vérifiée par `npm run check:setup`), elle prime
 * sur un éventuel NEXT_PUBLIC_APP_URL resté à localhost. Sans elle, ces pages appelaient
 * localhost:3000 sur Vercel.
 */
export function getAppBaseUrl(): string {
  const url = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}
