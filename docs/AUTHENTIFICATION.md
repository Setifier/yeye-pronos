# Authentification

## Vue d'ensemble

Le projet utilise **Better Auth** pour gerer l'authentification :
- Email/password avec verification
- OAuth Google (account linking automatique)
- Magic link (connexion par email sans mot de passe)
- Roles USER/ADMIN
- Sessions de 30 jours, cookieCache desactive

## Configuration Better Auth

**Fichier** : `src/lib/auth.ts`

### Methodes de connexion

1. **Email + Mot de passe** — Validation email obligatoire, auto-signin apres verification, hashing Argon2
2. **OAuth Google** — Account linking active (se lie automatiquement si meme email)
3. **Magic Link** — Lien valide 15 minutes

### Sessions

```typescript
session: {
  expiresIn: 30 * 24 * 60 * 60, // 30 jours
  cookieCache: {
    enabled: false, // Desactive pour eviter erreur 431
  }
}
```

### Donnees de session

Chaque session inclut automatiquement :
```typescript
{
  user: {
    id: string,
    name: string,
    email: string,
    role: "USER" | "ADMIN",
    hasCompletedOnboarding: boolean,
  }
}
```

## Fonctions d'authentification

**Fichier** : `src/lib/auth-helpers.ts`

### `getSafeSession()`

Recupere la session en gerant les cookies orphelins.

```typescript
import { getSafeSession } from "@/lib/auth-helpers";

const session = await getSafeSession();
// session peut etre null si non connecte
```

- Si cookie existe mais session invalide → redirect vers `/auth/clear-cookies`
- Sinon → retourne la session ou `null`
- Usage : pages publiques qui adaptent le contenu selon l'auth

### `requireAuth(redirectTo?)`

Garantit que l'utilisateur est connecte.

```typescript
import { requireAuth } from "@/lib/auth-helpers";

const session = await requireAuth("/dashboard");
// session est TOUJOURS defini (jamais null)
```

- Si non connecte → redirect vers `/auth/login?redirect=...`
- Si cookie orphelin → redirect vers `/auth/clear-cookies`
- Usage : toutes les pages protegees

### `requireAdmin()`

Garantit que l'utilisateur est admin.

```typescript
import { requireAdmin } from "@/lib/auth-helpers";

const session = await requireAdmin();
// session.user.role === "ADMIN" garanti
```

- Si non connecte → redirect vers `/auth/login`
- Si connecte mais pas admin → redirect vers `/dashboard`

## Middleware

**Fichier** : `src/middleware.ts`

### Routes protegees

```typescript
const protectedRoutes = [
  "/profile",
  "/admin/dashboard",
  "/parametres",
  "/amis",
  "/dashboard",
  "/pronos",
];
```

### Comportement

1. **Non connecte sur route protegee** : `/dashboard` → `/auth/login?redirect=/dashboard`
2. **Connecte sur page auth** : `/auth/login` → `/dashboard`
   - Exceptions : `/auth/verify`, `/auth/clear-cookies`, `/auth/reset-password`
3. **Cookie orphelin** : Le middleware laisse passer, `getSafeSession()` gere le redirect

## Cookies orphelins

### Definition

Cookie de session existant dans le navigateur mais dont l'utilisateur a ete supprime de la base.

### Detection automatique

Dans `auth-helpers.ts` :
```typescript
const hasCookie = !!getSessionCookie(req);
const session = await auth.api.getSession();

if (hasCookie && !session) {
  // Cookie orphelin detecte
  redirect("/auth/clear-cookies");
}
```

### Nettoyage

**Page** : `/auth/clear-cookies`
- Bouton pour supprimer tous les cookies
- Appelle l'API `/api/clear-session`
- Supprime les cookies cote client
- Redirect automatique vers `/auth/login` apres 2s

**API** : `POST /api/clear-session`
```typescript
cookieStore.getAll().forEach((cookie) => {
  cookieStore.delete(cookie.name);
});
```

## Flows d'authentification

### Inscription Email/Password

```
Register → Sign Up → Email de verification
→ /auth/register/success
→ Clic sur lien dans email
→ /auth/verify (auto-signin)
→ /onboarding (si nouveau)
→ /dashboard
```

### Connexion Email/Password

```
Login → Sign In
→ /dashboard
→ Si hasCompletedOnboarding = false → /onboarding
```

### OAuth Google

```
Clic "Se connecter avec Google"
→ Redirect Google → Auth + consent
→ Callback → Better Auth cree/lie le compte
→ /dashboard
→ Si premier login → /onboarding
```

### Magic Link

```
Saisie email → Magic link envoye
→ Clic sur lien → Auto-signin
→ /dashboard
```

### Cookie orphelin detecte

```
Page protegee avec cookie orphelin
→ getSafeSession() detecte l'incoherence
→ /auth/clear-cookies
→ Clic "Supprimer cookies"
→ Cleanup API + client
→ /auth/login
```

## Exemples d'utilisation

### Page publique adaptative

```typescript
// src/app/page.tsx
import { getSafeSession } from "@/lib/auth-helpers";

export default async function Home() {
  const session = await getSafeSession();

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasCompletedOnboarding: true },
    });
    if (!user?.hasCompletedOnboarding) {
      redirect("/onboarding");
    } else {
      redirect("/dashboard");
    }
  }

  return <LandingPage />;
}
```

### Page protegee

```typescript
// src/app/profile/page.tsx
import { requireAuth } from "@/lib/auth-helpers";

export default async function ProfilePage() {
  const session = await requireAuth("/profile");
  return <ProfileView user={session.user} />;
}
```

### Page admin

```typescript
// src/app/admin/dashboard/page.tsx
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminDashboard() {
  const session = await requireAdmin();
  return <AdminView />;
}
```

### API Route protegee

```typescript
// src/app/api/pronos/route.ts
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Suite du traitement...
}
```

## Gestion d'erreurs

### Erreur 431 (Request Header Fields Too Large)

Cause : Cookie cache de Better Auth trop volumineux.
Solution : cookieCache desactive dans la configuration.

### Redirects en boucle

Causes possibles :
1. Cookie orphelin → Resolu avec `getSafeSession()`
2. Middleware mal configure → Resolu avec exceptions
3. Client-side redirect → Verifier les `useEffect` avec redirects

### Session invalide silencieuse

Cookie existe mais `getSession()` retourne `null`.
Solution : Utiliser `getSafeSession()` qui detecte et redirige automatiquement.

## Checklist de securite

- [x] Protection des routes sensibles via middleware
- [x] Validation email obligatoire
- [x] Hashing securise (Argon2)
- [x] Sessions expirees apres 30 jours
- [x] HTTP-only cookies
- [x] Detection des cookies orphelins
- [x] Nettoyage automatique des sessions invalides
- [x] Account linking securise (meme email)
- [x] RBAC avec roles USER/ADMIN

## Depannage

**"Je suis deconnecte sans raison"** — Session expiree (30 jours). Se reconnecter.

**"Erreur 401 alors que je suis connecte"** — Cookie orphelin probable. Aller sur `/auth/clear-cookies`.

**"Impossible d'acceder aux pages auth connecte"** — Normal. Le middleware redirige vers `/dashboard`.

**"L'onboarding se relance"** — Verifier que `hasCompletedOnboarding` est mis a `true` apres onboarding.

## References

- [Better Auth Docs](https://www.better-auth.com/docs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
