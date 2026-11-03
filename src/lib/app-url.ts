/**
 * URL de l'app, pour qu'une page serveur appelle sa propre API.
 * BETTER_AUTH_URL est obligatoire en prod (vérifiée par `npm run check:setup`) : pas besoin
 * d'une variable de plus. Sans elle, ces pages appelaient localhost:3000 sur Vercel.
 */
export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}
