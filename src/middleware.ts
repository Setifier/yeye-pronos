import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

/**
 * Routes qui nécessitent une authentification
 * Ces routes redirigeront vers /auth/login si l'utilisateur n'est pas connecté
 */
const protectedRoutes = [
  "/profile",
  "/admin/dashboard",
  "/parametres",
  "/amis",
  "/dashboard",
  "/pronos",
  "/onboarding",
  "/joueur",   // fiches des joueurs de l'app et leurs pronos (pas /joueurs : stats NBA publiques)
  "/comparer",
];

/**
 * Middleware d'authentification
 *
 * Gère :
 * - Protection des routes authentifiées
 * - Redirect des utilisateurs connectés loin des pages auth
 * - Nettoyage des cookies orphelins (sessions invalides)
 */
export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const sessionCookie = getSessionCookie(req);

  const isLoggedIn = !!sessionCookie;
  const isOnProtectedRoute = protectedRoutes.some(route =>
    nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  );
  const isOnAuthRoute = nextUrl.pathname.startsWith("/auth");

  // Protéger les routes authentifiées
  if (isOnProtectedRoute && !isLoggedIn) {
    // Sauvegarder l'URL d'origine pour redirect après login
    const loginUrl = new URL("/auth/login", req.url);
    if (nextUrl.pathname !== "/dashboard") {
      loginUrl.searchParams.set("redirect", nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Rediriger les utilisateurs connectés loin des pages d'authentification
  // Exception: /auth/verify (vérification email), /auth/clear-cookies (nettoyage)
  if (isOnAuthRoute && isLoggedIn) {
    const allowedAuthPaths = ["/auth/verify", "/auth/clear-cookies", "/auth/reset-password"];
    const isAllowedPath = allowedAuthPaths.some(path => nextUrl.pathname.startsWith(path));

    if (!isAllowedPath) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
