# 🎨 Badge Display Component - Documentation

## Vue d'ensemble

Système d'affichage des badges utilisateur intégré au dashboard et au profil. Permet de visualiser les badges débloqués avec des statistiques détaillées.

---

## Composants créés

### 1. `UserBadgesDisplay` (`/src/components/user-badges-display.tsx`)

Composant principal d'affichage des badges avec deux variantes :

#### **Variant "compact"** (Dashboard)
- **Usage** : Sidebar ou widget de dashboard
- **Features** :
  - Barre de progression globale
  - 6 badges maximum (les plus prestigieux)
  - Grid 3 colonnes
  - Tooltip au hover
  - Lien vers page complète
  - Indicateur de rareté (lettre : C/R/E/L)

#### **Variant "featured"** (Profile)
- **Usage** : Page de profil ou section dédiée
- **Features** :
  - Header avec stats détaillées
  - 5 cartes de stats (Progression + 4 raretés)
  - 6 badges prestigieux en grand format
  - Tooltip complet avec date de déblocage
  - Bouton "Voir la collection"
  - Empty state si aucun badge

---

## API Endpoint créé

### `GET /api/users/[userId]/badges`

**Endpoint** : `/api/users/[userId]/badges`

**Response format** :
```json
{
  "badges": [
    {
      "id": "uuid",
      "slug": "rookie",
      "name": "Rookie",
      "description": "Remporter 10 pronos en une saison",
      "icon": "🏀",
      "category": "SEASON",
      "type": "VOLUME",
      "rarity": "COMMON",
      "reward": "Le Rookie",
      "isUnlocked": true,
      "unlockedAt": "2025-01-15T12:00:00Z",
      "progress": 10,
      "requirement": 10
    }
  ],
  "stats": {
    "total": 80,
    "unlocked": 12,
    "percentage": 15,
    "byRarity": {
      "COMMON": { "total": 32, "unlocked": 8 },
      "RARE": { "total": 28, "unlocked": 3 },
      "EPIC": { "total": 15, "unlocked": 1 },
      "LEGENDARY": { "total": 5, "unlocked": 0 }
    },
    "byCategory": {
      "SEASON": { "total": 40, "unlocked": 8 },
      "END_SEASON": { "total": 20, "unlocked": 2 },
      "CAREER": { "total": 20, "unlocked": 2 }
    }
  }
}
```

**Données retournées** :
- Tous les badges (80) avec leur statut de déblocage
- Stats globales et par rareté
- Stats par catégorie

---

## Intégration Dashboard

### Fichier : `/src/components/dashboard-page.tsx`

**Ajouté** :
1. Import `UserBadgesDisplay`
2. State `badgesData` et `badgesLoading`
3. `useEffect` pour fetch les badges au mount
4. Section badges après "Recent Predictions"

**Affichage** :
- Variant **compact**
- 6 badges maximum
- Position : Après la liste des derniers pronos
- Loading state avec spinner

**Code ajouté** :
```tsx
{badgesLoading ? (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
    </div>
  </div>
) : (
  badgesData && (
    <section>
      <UserBadgesDisplay
        badges={badgesData.badges}
        stats={badgesData.stats}
        variant="compact"
        maxDisplay={6}
      />
    </section>
  )
)}
```

---

## Intégration Profile

### Fichier : `/src/app/profile/page.tsx`

**Ajouté** :
1. Import `ProfileBadgesSection`
2. Section badges avant "Actions"

### Fichier : `/src/components/profile-badges-section.tsx`

Wrapper client component qui :
- Fetch les badges via l'API
- Gère le loading state
- Affiche `UserBadgesDisplay` en variant "featured"

**Affichage** :
- Variant **featured**
- 6 badges prestigieux
- Stats complètes par rareté
- Position : Après "Méthodes de connexion"

---

## Logique de tri des badges

Les badges affichés sont triés par :
1. **Rareté décroissante** : LEGENDARY → EPIC → RARE → COMMON
2. **Date de déblocage** : Plus récent en premier

Cela garantit que les badges les plus prestigieux sont toujours affichés en priorité.

---

## Features principales

### 🎨 Design
- **Thème sombre** : zinc-900/zinc-800
- **Gradients de rareté** :
  - COMMON : zinc (gris)
  - RARE : blue
  - EPIC : purple
  - LEGENDARY : yellow
- **Glows** : Shadow boxes selon la rareté
- **Animations** : Hover scale, transitions

### 📊 Stats affichées

#### Compact variant
- Progression globale (%)
- Total badges débloqués / Total

#### Featured variant
- Progression globale (%)
- COMMON : unlocked/total
- RARE : unlocked/total
- EPIC : unlocked/total
- LEGENDARY : unlocked/total

### 🏆 Affichage badge

Chaque badge contient :
- **Icon** : Emoji 48px
- **Name** : Nom du badge
- **Rarity badge** : Pastille de couleur
- **Reward** : Titre débloqué (si existant)
- **Tooltip** : Au hover
  - Nom complet
  - Description
  - Date de déblocage (featured variant)

### 🔗 Navigation
- **"Voir tout"** (compact) : Lien vers `/badges`
- **"Voir la collection"** (featured) : Lien vers `/badges`

### 💫 Empty states
- **Aucun badge débloqué** :
  - Icon Lock
  - Message encourageant
  - CTA "Commence à pronostiquer !"

---

## Performance

### Optimisations
- Fetch parallèle dans le dashboard
- Loading states séparés (badges indépendants des autres données)
- Slice des badges affichés (max 6)
- Tri côté client (données déjà chargées)

### Cache potentiel
Pour optimiser plus tard (Option 3) :
- Cache Redis des badges utilisateur (5 min)
- Revalidation automatique après déblocage
- SSR avec revalidate

---

## Usage dans d'autres pages

Pour ajouter le composant ailleurs :

```tsx
import { UserBadgesDisplay } from "@/components/user-badges-display";

// Fetch badges
const response = await fetch(`/api/users/${userId}/badges`);
const { badges, stats } = await response.json();

// Afficher
<UserBadgesDisplay
  badges={badges}
  stats={stats}
  variant="compact" // ou "featured"
  maxDisplay={6}    // nombre de badges à afficher
/>
```

---

## Prochaines étapes possibles

1. **Système de titres** : Permettre de sélectionner un titre et l'afficher sur le profil
2. **Notifications** : Toast quand un badge est débloqué
3. **Partage social** : Partager un badge débloqué
4. **Historique** : Timeline des badges débloqués
5. **Comparaison** : Comparer badges avec d'autres joueurs
6. **Badges animés** : Animations au déblocage

---

## Fichiers créés/modifiés

### Nouveaux fichiers
- `/src/components/user-badges-display.tsx` (Composant principal)
- `/src/components/profile-badges-section.tsx` (Wrapper profile)
- `/src/app/api/users/[userId]/badges/route.ts` (API endpoint)
- `/BADGE-DISPLAY-IMPLEMENTATION.md` (Cette doc)

### Fichiers modifiés
- `/src/components/dashboard-page.tsx` (Ajout section badges)
- `/src/app/profile/page.tsx` (Ajout section badges)

---

## Résumé

✅ **Composant réutilisable** avec 2 variantes (compact/featured)
✅ **API endpoint** dédié aux badges utilisateur
✅ **Intégration Dashboard** (compact variant)
✅ **Intégration Profile** (featured variant)
✅ **Stats détaillées** par rareté et catégorie
✅ **Empty states** élégants
✅ **Tooltips** informatifs
✅ **Navigation** vers page complète
✅ **Design cohérent** avec le reste de l'app

Le système d'affichage des badges est maintenant pleinement opérationnel et intégré ! 🎉
