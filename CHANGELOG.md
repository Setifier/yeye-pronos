# Changelog - NBA Pronos

## Corrections et améliorations récentes

### 🐛 Correction des erreurs 500

**Problème résolu :**
- Les erreurs 500 lors de la navigation dans le calendrier

**Solutions appliquées :**
1. **Gestion améliorée des erreurs dans l'API** (`src/app/api/games/route.ts`)
   - Retourne un tableau vide au lieu d'une erreur 500 quand il n'y a pas de matchs
   - Logs ajoutés pour faciliter le débogage
   - Gestion gracieuse des erreurs API de balldontlie

2. **Messages d'erreur plus informatifs**
   - "No games found or API error" au lieu d'un crash
   - Affichage côté client : "Aucun match prévu pour cette date"

### 🕐 Affichage des heures amélioré

**Nouvelles fonctionnalités :**

1. **Double affichage timezone** :
   - **Heure locale** (Eastern Time - New York) en grand
   - **Heure de Paris** (UTC+1) en petit dessous
   - Format : `19:30` (local) + `01:30 (Paris)` (petit)

2. **Intelligent et adaptatif** :
   - Fonctionne avec la date ISO complète du match
   - Gestion automatique des conversions de timezone
   - Fallback sur "TBD" si pas d'heure disponible

### 💡 Fonctionnalité No Spoil

**Activation par défaut :**
- Les scores sont masqués par défaut
- Toggle en haut à droite pour afficher/masquer
- Préférence sauvegardée dans localStorage

**Comportement :**
- Mode activé : Badge "Score masqué" + pas de scores
- Mode désactivé : Tous les scores visibles

## Architecture

### Structure des composants

```
src/
├── components/
│   ├── navbar.tsx              # Navigation principale
│   ├── footer.tsx              # Pied de page
│   ├── date-navigation.tsx     # Scroll horizontal des dates
│   ├── game-card.tsx           # Carte de match (avec heures)
│   └── no-spoil-toggle.tsx     # Toggle No Spoil
├── app/
│   ├── page.tsx                # Page d'accueil
│   ├── layout.tsx              # Layout global
│   └── api/
│       └── games/
│           └── route.ts        # API route (gestion erreurs)
└── lib/
    ├── balldontlie.ts          # SDK API NBA
    └── nba-logos.ts            # Configuration logos
```

### Gestion des erreurs

**API Route (`/api/games`)** :
- ✅ Validation des paramètres
- ✅ Logs détaillés
- ✅ Retour gracieux en cas d'erreur
- ✅ Pas de 500 pour "pas de matchs"

**Client (page.tsx)** :
- ✅ États de chargement
- ✅ Gestion des erreurs
- ✅ Messages utilisateur clairs
- ✅ Bouton "Réessayer"

## Utilisation

### Ajouter des logos

1. Créer le dossier : `public/logos/nba/`
2. Ajouter les logos : `BOS.png`, `LAL.png`, etc.
3. Mettre à jour `src/lib/nba-logos.ts`

Voir `LOGOS-SETUP.md` pour plus de détails.

### Variables d'environnement

```env
DATABASE_URL=postgresql://...
BALLDONTLIE_API_KEY=your_api_key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Prochaines étapes suggérées

1. [ ] Créer la page `/pronos` (liste des pronos de l'utilisateur)
2. [ ] Créer la page `/classement` (leaderboard)
3. [ ] Implémenter le système de pronostic
4. [ ] Ajouter la logique de calcul des points
5. [ ] Créer un système de notifications
6. [ ] Ajouter des filtres (par conférence, division, équipe)
7. [ ] Implémenter le système de badges/récompenses

## Notes techniques

### Timezones

L'application utilise deux timezones :
- **America/New_York** : Heure locale des matchs NBA (ET)
- **Europe/Paris** : Heure pour l'utilisateur (UTC+1)

### API balldontlie

Limites à connaître :
- Rate limiting possible
- Toutes les dates n'ont pas forcément de matchs
- Les heures sont en UTC dans l'API

### Performance

- Build size : ~114 kB pour la page d'accueil
- Toutes les pages sont en Server-Side Rendering (SSR)
- Navigation fluide avec scroll horizontal optimisé
