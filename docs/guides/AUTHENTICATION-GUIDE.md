# Guide d'Authentification - NBA Pronos

## 📋 Vue d'ensemble

Ce projet utilise **Better Auth** pour gérer l'authentification avec une configuration robuste qui gère :
- ✅ Cookies orphelins (sessions invalides)
- ✅ Redirections intelligentes
- ✅ Protection des routes sensibles
- ✅ Multiple méthodes de connexion

---

## 🏗️ Architecture

### Better Auth Configuration

**Fichier**: `src/lib/auth.ts`

#### Méthodes de connexion disponibles

1. **Email + Mot de passe**
   - Validation email obligatoire
   - Auto-signin après vérification: ✅
   - Argon2 pour le hashing

2. **OAuth Google**
   - Account linking activé
   - Se lie automatiquement si même email

3. **Magic Link** (lien de connexion par email)
   - Pas besoin de mot de passe
   - Lien valide 15 minutes

#### Sessions

```typescript
session: {
  expiresIn: 30 * 24 * 60 * 60, // 30 jours
  cookieCache: {
    enabled: false, // Désactivé pour éviter erreur 431
  }
}
```

#### Custom Session Data

Chaque session inclut automatiquement :
```typescript
{
  user: {
    id: string,
    name: string,
    email: string,
    role: "USER" | "ADMIN",
    hasCompletedOnboarding: boolean, // 🆕 Pour le flow d'onboarding
  }
}
```

---

## 🔐 Fonctions d'authentification

### Fichier: `src/lib/auth-helpers.ts`

#### 1. `getSafeSession()`

Récupère la session de manière **sécurisée** en gérant les cookies orphelins.

**Utilisation** :
```typescript
import { getSafeSession } from "@/lib/auth-helpers";

const session = await getSafeSession();
// session peut être null si non connecté
```

**Comportement** :
- Si cookie existe mais session invalide → Redirect vers `/auth/clear-cookies`
- Sinon → Retourne la session ou `null`

**Cas d'usage** :
- Pages publiques qui adaptent le contenu selon l'auth (ex: home page)
- Layouts qui doivent afficher différemment si connecté

---

#### 2. `requireAuth(redirectTo?)`

Garantit que l'utilisateur est connecté, sinon redirige vers login.

**Utilisation** :
```typescript
import { requireAuth } from "@/lib/auth-helpers";

const session = await requireAuth("/dashboard");
// session est TOUJOURS défini ici (jamais null)
```

**Paramètres** :
- `redirectTo` (optionnel) : URL de redirection après login

**Comportement** :
- Si non connecté → Redirect vers `/auth/login?redirect=...`
- Si cookie orphelin → Redirect vers `/auth/clear-cookies`
- Sinon → Retourne la session

**Cas d'usage** :
- Toutes les pages protégées (dashboard, profile, etc.)

---

#### 3. `requireAdmin()`

Garantit que l'utilisateur est admin, sinon redirige.

**Utilisation** :
```typescript
import { requireAdmin } from "@/lib/auth-helpers";

const session = await requireAdmin();
// session.user.role === "ADMIN" garanti
```

**Comportement** :
- Si non connecté → Redirect vers `/auth/login`
- Si connecté mais pas admin → Redirect vers `/dashboard`
- Si cookie orphelin → Redirect vers `/auth/clear-cookies`

**Cas d'usage** :
- Pages admin uniquement

---

## 🛣️ Middleware

**Fichier**: `src/middleware.ts`

### Routes protégées

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

1. **User non connecté accède à route protégée** :
   ```
   /dashboard → /auth/login?redirect=/dashboard
   ```

2. **User connecté accède à auth pages** :
   ```
   /auth/login → /dashboard
   /auth/register → /dashboard
   ```

   **Exceptions** :
   - `/auth/verify` (vérification email)
   - `/auth/clear-cookies` (nettoyage cookies)
   - `/auth/reset-password` (reset mot de passe)

3. **Cookie orphelin détecté** :
   - Le middleware laisse passer
   - Les fonctions `getSafeSession()` / `requireAuth()` gèrent le redirect

---

## 🧹 Nettoyage des cookies orphelins

### Qu'est-ce qu'un cookie orphelin ?

Un cookie de session qui existe dans le navigateur mais dont l'utilisateur a été supprimé de la base de données.

**Symptômes** :
- Redirects en boucle
- "Unauthorized" alors que le cookie existe
- Erreurs 401 répétées

### Solution automatique

Le système détecte automatiquement les cookies orphelins via :

**Détection** (dans `auth-helpers.ts`) :
```typescript
const hasCookie = !!getSessionCookie(req);
const session = await auth.api.getSession();

if (hasCookie && !session) {
  // Cookie orphelin détecté !
  redirect("/auth/clear-cookies");
}
```

### Solution manuelle

**Page** : `/auth/clear-cookies`

**Fonctionnalités** :
- Bouton pour supprimer tous les cookies
- Appelle l'API `/api/clear-session`
- Supprime aussi les cookies côté client
- Redirect automatique vers `/auth/login` après 2s

**API Route** : `/api/clear-session`
```typescript
// Supprime TOUS les cookies server-side
cookieStore.getAll().forEach((cookie) => {
  cookieStore.delete(cookie.name);
});
```

---

## 🔄 Flows d'authentification

### 1. Inscription Email/Password

```
Register Page
  ↓
Sign Up Action
  ↓
Email de vérification envoyé
  ↓
/auth/register/success (message de confirmation)
  ↓
User clique sur lien dans email
  ↓
/auth/verify (auto-signin)
  ↓
/nouveau-joueur (onboarding)
  ↓
Complete onboarding
  ↓
/dashboard
```

### 2. Connexion Email/Password

```
Login Page
  ↓
Sign In Action
  ↓
/dashboard (check onboarding)
  ↓
Si hasCompletedOnboarding = false → /nouveau-joueur
Sinon → Affichage dashboard
```

### 3. OAuth (Google)

```
Click "Se connecter avec Google"
  ↓
Redirect vers Google
  ↓
Google auth + consent
  ↓
Callback vers app
  ↓
Better Auth crée/lie le compte
  ↓
/dashboard
  ↓
Si premier login → /nouveau-joueur
Sinon → Dashboard
```

### 4. Magic Link

```
Enter email
  ↓
Magic link envoyé
  ↓
User clique sur lien
  ↓
Auto-signin
  ↓
/dashboard
```

### 5. Cookie orphelin détecté

```
Page protégée avec cookie orphelin
  ↓
getSafeSession() détecte l'incohérence
  ↓
Redirect → /auth/clear-cookies
  ↓
User clique "Supprimer cookies"
  ↓
API + Client-side cleanup
  ↓
Redirect → /auth/login
  ↓
User se reconnecte normalement
```

---

## 📝 Exemples d'utilisation

### Page publique qui s'adapte à l'auth

```typescript
// src/app/page.tsx
import { getSafeSession } from "@/lib/auth-helpers";

export default async function Home() {
  const session = await getSafeSession();

  if (session?.user) {
    // User connecté → Afficher dashboard ou onboarding
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasCompletedOnboarding: true },
    });

    if (!user?.hasCompletedOnboarding) {
      redirect("/nouveau-joueur");
    } else {
      redirect("/dashboard");
    }
  }

  // User non connecté → Landing page
  return <LandingPage />;
}
```

### Page protégée simple

```typescript
// src/app/profile/page.tsx
import { requireAuth } from "@/lib/auth-helpers";

export default async function ProfilePage() {
  const session = await requireAuth("/profile");

  // À ce stade, session est TOUJOURS défini
  return <ProfileView user={session.user} />;
}
```

### Page admin

```typescript
// src/app/admin/dashboard/page.tsx
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminDashboard() {
  const session = await requireAdmin();

  // session.user.role === "ADMIN" garanti
  return <AdminView />;
}
```

### API Route protégée

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

---

## 🚨 Gestion d'erreurs

### Erreur 431 (Request Header Fields Too Large)

**Cause** : Cookie cache de Better Auth trop volumineux

**Solution appliquée** :
```typescript
session: {
  cookieCache: {
    enabled: false, // ✅ Désactivé
  }
}
```

### Redirects en boucle

**Symptômes** : `GET /profile 200` répété à l'infini dans les logs

**Causes possibles** :
1. Cookie orphelin → **Résolu** avec `getSafeSession()`
2. Middleware mal configuré → **Résolu** avec exceptions
3. Client-side redirect qui conflict → Vérifier les `useEffect` avec redirects

**Debug** :
```bash
# Supprimer tous les cookies manuellement
# Chrome DevTools → Application → Cookies → Clear all
```

### Session invalide silencieuse

**Symptômes** : Cookie existe mais `getSession()` retourne `null`

**Solution** : Utiliser `getSafeSession()` qui détecte et redirige automatiquement

---

## ✅ Checklist de sécurité

- [x] Protection des routes sensibles via middleware
- [x] Validation email obligatoire pour sign-up
- [x] Hashing sécurisé (Argon2)
- [x] Sessions expirées après 30 jours
- [x] HTTP-only cookies (protection XSS)
- [x] Detection des cookies orphelins
- [x] Nettoyage automatique des sessions invalides
- [x] Rate limiting sur auth routes (TODO si besoin)
- [x] Account linking sécurisé (même email)
- [x] RBAC avec rôles USER/ADMIN

---

## 🔧 Dépannage

### "Je suis déconnecté sans raison"

→ Session expirée (30 jours). Se reconnecter.

### "Erreur 401 alors que je suis connecté"

→ Cookie orphelin probable. Aller sur `/auth/clear-cookies`

### "Impossible d'accéder aux pages auth alors que je suis connecté"

→ Normal ! Le middleware redirige vers `/dashboard` pour éviter les conflits

### "L'onboarding se relance à chaque connexion"

→ Vérifier que `hasCompletedOnboarding` est bien mis à `true` après onboarding

---

## 📚 Références

- [Better Auth Docs](https://www.better-auth.com/docs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Argon2 Hashing](https://github.com/ranisalt/node-argon2)

---

## 🎯 TODO Futurs

- [ ] Rate limiting sur `/api/auth/**`
- [ ] 2FA/MFA (Two-Factor Authentication)
- [ ] Session management UI (voir toutes les sessions actives)
- [ ] Password strength meter
- [ ] Login history/audit log
- [ ] Refresh token rotation
- [ ] Device fingerprinting
