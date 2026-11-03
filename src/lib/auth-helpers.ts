import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Récupère la session de l'utilisateur de manière sécurisée
 *
 * Gère automatiquement les cookies orphelins :
 * - Si un cookie existe mais que la session est invalide (user supprimé),
 *   redirige vers /auth/clear-cookies pour nettoyer
 *
 * @param options - Options de récupération de session
 * @returns La session de l'utilisateur ou null si non connecté
 */
export async function getSafeSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Vérifier s'il y a un cookie orphelin
  // (cookie existe mais session invalide = user supprimé de la DB)
  const hasCookie = !!getSessionCookie({
    headers: headersList,
    get: (name: string) => headersList.get(name),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (hasCookie && !session) {
    // Cookie orphelin détecté → Rediriger vers nettoyage
    redirect("/auth/clear-cookies");
  }

  return session;
}

/**
 * Récupère la session et garantit que l'utilisateur est connecté
 *
 * Si l'utilisateur n'est pas connecté, redirige vers /auth/login
 * Gère automatiquement les cookies orphelins
 *
 * @param redirectTo - URL optionnelle vers laquelle rediriger après login
 * @returns La session de l'utilisateur (jamais null)
 */
export async function requireAuth(redirectTo?: string) {
  const session = await getSafeSession();

  if (!session) {
    const loginUrl = redirectTo
      ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}`
      : "/auth/login";
    redirect(loginUrl);
  }

  return session;
}

/**
 * Récupère la session et garantit que l'utilisateur est admin
 *
 * Si l'utilisateur n'est pas admin, redirige vers /dashboard
 * Si l'utilisateur n'est pas connecté, redirige vers /auth/login
 *
 * @returns La session de l'utilisateur admin
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}
