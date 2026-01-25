# 🏀 Résumé du système NBA - Yeye Pronos

## ✅ Système actuel (ESPN API)

### API et données

**Source** : ESPN API (gratuite, pas de clé)
- URL : `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
- IDs matchs : **401xxxxxx** (commence par 40, 41, 42)
- Vraies heures des matchs (timezone locale US)
- Stats joueurs en temps réel (box scores)

### CRON Jobs en production

```json
{
  "refresh-daily-games": {
    "schedule": "0 7 * * *",
    "description": "8h Paris - Détecte matchs du jour"
  },
  "update-live-scores": {
    "schedule": "* * * * *",
    "description": "Chaque minute - Scores + pronos + badges + standings"
  },
  "update-injuries": {
    "schedule": "*/15 * * * *",
    "description": "Toutes les 15 min - Infirmerie NBA"
  },
  "daily-digest": {
    "schedule": "0 8 * * 1",
    "description": "Lundis 9h Paris - Récap hebdo email"
  }
}
```

### Scripts principaux

Voir [SCRIPTS.md](../SCRIPTS.md) pour la liste complète.

| Script | Usage |
|--------|-------|
| `sync-espn-all-games.ts` | Sync complète (matchs + stats) |
| `seed-espn.ts` | Seed initial des matchs |
| `backfill-game-stats.ts` | Stats joueurs uniquement |
| `check-db-status.ts` | Vérifier l'état de la DB |

## 📊 Architecture complète

```
┌─────────────────────────────────────────────┐
│            ESPN API (GRATUITE)              │
│         ✅ Pas de clé API                   │
│         ✅ Vraies heures                     │
│         ✅ Stats joueurs                     │
└──────────┬──────────────────────────────────┘
           │
           │ [1] Seed initial (1x)
           │     prisma/seed-espn.ts
           │     └─> 30 équipes + 1230 matchs
           │
           │ [2] CRON refresh-daily-games (8h)
           │     /api/cron/refresh-daily-games
           │     └─> Détection nouveaux matchs
           │
           │ [3] CRON update-live-scores (1 min)
           │     /api/cron/update-live-scores
           │     └─> Scores + pronos + badges
           │
           │ [4] CRON update-injuries (15 min)
           │     /api/cron/update-injuries
           │     └─> Statut joueurs blessés
           │
           ▼
┌─────────────────────────────────────────────┐
│      PostgreSQL (Neon)                      │
│                                             │
│  Team (30 équipes)                          │
│    ├─ externalId: "1" (ESPN)                │
│    └─ logoUrl, conference, division         │
│                                             │
│  Game (1230+ matchs saison 2025-26)        │
│    ├─ externalId: "401704923" (ESPN)       │
│    ├─ gameDate (UTC)                        │
│    ├─ localGameDate (timezone US)           │
│    ├─ currentPeriod, gameClock              │
│    └─ topScorer, scoreMargin, bonus...     │
│                                             │
│  Player (~500 joueurs actifs)               │
│    ├─ externalId (ESPN)                     │
│    ├─ headshot, position, jersey           │
│    └─ seasonStats (PPG, RPG, APG...)        │
│                                             │
│  Prediction (pronos utilisateurs)           │
│    ├─ predictedTeam, margin, topScorer     │
│    ├─ pointsEarned (base + bonus)           │
│    └─ marginBonus, topScorerBonus, combo   │
│                                             │
│  User, Badge, Notification, Friendship...   │
└──────────┬──────────────────────────────────┘
           │
           │ [5] API Routes (lecture seule)
           │     /api/games, /api/predictions
           │     └─> 0 appel externe
           │
           ▼
┌─────────────────────────────────────────────┐
│       Frontend Next.js 15                   │
│                                             │
│  - Affichage matchs par date (no spoil)    │
│  - Pronos avec bonus (margin + top scorer) │
│  - Classement temps réel                   │
│  - Système de badges (12 familles)         │
│  - Notifications en temps réel             │
│  - Profils publics avec stats              │
│  - Système d'amis et comparaison           │
│  - Onboarding complet (favoris, avatar)    │
└─────────────────────────────────────────────┘
```

## 🎯 Fonctionnalités complètes

### ✅ Authentification
- Email/password avec vérification
- OAuth Google
- Magic link login
- Onboarding pour nouveaux utilisateurs
- Gestion de compte (avatar, favoris)

### ✅ Système de pronos
- Pronostiquer l'équipe gagnante
- **Bonus prédiction d'écart** (CLOSE, MEDIUM, BLOWOUT, OVERTIME)
- **Bonus top scorer** (meilleur marqueur du match)
- **Bonus combo** (écart + top scorer correct = x2)
- Deadline 30 minutes avant le match
- Points attribués automatiquement

### ✅ Scores en temps réel
- Mise à jour toutes les minutes
- Status SCHEDULED → LIVE → FINAL
- Période et horloge du match
- Calcul automatique des résultats
- Standings NBA recalculés en temps réel

### ✅ Système de badges
- 12 familles de badges (Prédiction, Streak, Score, etc.)
- 4 raretés (COMMON, RARE, EPIC, LEGENDARY)
- Attribution automatique après chaque prono
- Affichage sur profils publics

### ✅ Notifications
- Match terminé (avec score)
- Prono gagné/perdu (avec points)
- Nouveau badge débloqué
- Demande d'ami
- Récap hebdomadaire par email

### ✅ Social
- Système d'amis (demande, accepter, refuser)
- Comparaison de stats entre amis
- Profils publics consultables
- Classement global

### ✅ Onboarding
- Configuration du nom complet
- Sélection équipe favorite (avec recherche)
- Sélection joueur favori (recherche temps réel)
- Upload avatar avec crop/resize
- Affichage des favoris sur profils

## 📈 Calcul des points (système complet)

### Points de base
- ✅ Victoire simple : **1 point**

### Bonus prédiction d'écart
- Écart proche (≤5 pts ou OT) prédit : **+0.5 pt**
- Écart moyen (6-15 pts) prédit : **+0.5 pt**
- Large victoire (≥16 pts) prédite : **+0.5 pt**

### Bonus top scorer
- Meilleur marqueur du match prédit : **+1 pt**

### Bonus combo
- Écart + top scorer corrects : **points doublés** (x2)

### Exemples de calcul
1. Victoire simple : **1 pt**
2. Victoire + écart correct : **1.5 pts**
3. Victoire + top scorer : **2 pts**
4. Victoire + écart + top scorer : **5 pts** (2.5 × 2)

## 🗂️ Structure des fichiers

### Backend

**CRON Jobs** :
- `src/app/api/cron/refresh-daily-games/route.ts` - Détection matchs
- `src/app/api/cron/update-live-scores/route.ts` - Scores + pronos (PRINCIPAL)
- `src/app/api/cron/update-injuries/route.ts` - Infirmerie
- `src/app/api/cron/daily-digest/route.ts` - Email hebdo

**API Routes** :
- `src/app/api/games/route.ts` - Récupération matchs par date
- `src/app/api/predictions/route.ts` - Créer/récupérer pronos
- `src/app/api/players/search/route.ts` - Recherche joueurs
- `src/app/api/users/[id]/public-profile/route.ts` - Profil public

**Librairies** :
- `src/lib/espn.ts` - Client ESPN API
- `src/lib/espn-stats.ts` - Récupération stats joueurs
- `src/lib/badge-service.ts` - Système de badges
- `src/lib/notification-service.ts` - Notifications
- `src/lib/standings-calculator.ts` - Calcul standings NBA

**Scripts Prisma** :
- `prisma/seed-espn.ts` - Seed ESPN (ACTUEL)
- `prisma/seed-players.ts` - Seed joueurs
- `prisma/seed-badges.ts` - Seed badges
- `prisma/cleanup-balldontlie-games.ts` - Nettoie anciens matchs

### Frontend

**Pages** :
- `src/app/matchs/page.tsx` - Affichage matchs
- `src/app/classement/page.tsx` - Leaderboard
- `src/app/profile/page.tsx` - Profil utilisateur
- `src/app/joueur/[id]/page.tsx` - Profil public
- `src/app/comparer/[friendId]/page.tsx` - Comparaison amis
- `src/app/amis/page.tsx` - Gestion amis
- `src/app/nouveau-joueur/page.tsx` - Onboarding

**Composants** :
- `src/components/game-card.tsx` - Carte de match
- `src/components/prediction-modal.tsx` - Modal prono avec bonus
- `src/components/user-badges-display.tsx` - Affichage badges
- `src/components/friends/*` - Système d'amis

## 🚀 Déploiement Vercel

### Variables d'environnement

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://your-app.vercel.app

# Cloudinary (avatars)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...

# Email (Resend)
RESEND_API_KEY=...
EMAIL_FROM=noreply@your-domain.com

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# CRON
CRON_SECRET=... (générer avec: openssl rand -hex 32)

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Configuration CRON

Le fichier `vercel.json` configure automatiquement les 4 CRON jobs.

**Important** : Vérifier dans le dashboard Vercel :
- Onglet "Cron" : jobs actifs
- Logs : erreurs d'exécution
- Variables d'environnement : `CRON_SECRET` défini

### Commandes de déploiement

```bash
# 1. Push le code
git push

# 2. Vérifier le déploiement
vercel --prod

# 3. Vérifier les CRON (manuellement)
curl -X GET https://your-app.vercel.app/api/cron/update-live-scores \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Équipes NBA | 30 |
| Matchs saison 2025-26 | ~1,230 |
| Joueurs actifs | ~500 |
| Badges disponibles | 60+ |
| Familles de badges | 12 |
| CRON jobs | 4 |
| API routes | 15+ |
| Temps de seed | 10-15 min |
| Fréquence update scores | 1 minute |

## Format des IDs

**IDs ESPN** : `401xxxxxx`, `402xxxxxx`
- Vraies heures des matchs
- Stats joueurs disponibles

## Checklist production

### Avant déploiement
- [ ] Variables d'environnement configurées
- [ ] Database migrée (`npx prisma db push`)
- [ ] Seed ESPN exécuté (`npx tsx prisma/seed-espn.ts`)
- [ ] Seed des badges exécuté (`npx tsx prisma/seed-badges.ts`)
- [ ] Seed des joueurs exécuté (`npx tsx prisma/seed-players.ts`)

### Après déploiement
- [ ] CRON jobs actifs dans Vercel
- [ ] Test `/api/games?date=YYYY-MM-DD`
- [ ] Test création prono
- [ ] Test calcul points après match FINAL
- [ ] Test notifications
- [ ] Test badges
- [ ] Logs CRON sans erreurs

## 🐛 Bugs connus / Limitations

1. **Fréquence CRON** : 1 minute peut être coûteux sur Vercel (considérer 2-3 min)
2. **Rate limiting** : ESPN tolérante mais pas documentée officiellement
3. **Stats joueurs** : Peuvent mettre 1-2 min à apparaître après fin de match
4. **Timezones** : Complexité avec heures locales US vs Paris
5. **Email digest** : Nécessite Resend configuré

## 💡 Optimisations futures

1. **Cache Redis** : Pour `/api/games` et standings
2. **Queue système** : Pour notifications (Bull/BullMQ)
3. **Webhooks** : Si ESPN propose des webhooks (à investiguer)
4. **Delta updates** : Ne query que les matchs LIVE/TODAY
5. **CDN** : Pour logos équipes et avatars
6. **Monitoring** : Sentry ou similaire pour erreurs CRON
7. **Analytics** : Posthog ou Plausible pour usage

## Documentation

| Fichier | Description |
|---------|-------------|
| `docs/SCRIPTS.md` | Scripts de maintenance |
| `docs/setup/SETUP-NBA-DATA.md` | Setup complet ESPN |
| `docs/setup/QUICK-START-NBA.md` | Guide rapide |
| `docs/guides/NBA-SYSTEM-SUMMARY.md` | Ce fichier |
| `docs/architecture/BADGE-*.md` | Système de badges |

## 🎉 Résumé

Vous avez un système complet de pronos NBA avec :

✅ **Données en temps réel** (ESPN API gratuite)
✅ **Scores mis à jour chaque minute**
✅ **Système de points sophistiqué** (base + 3 types de bonus)
✅ **Badges et achievements** (12 familles, 60+ badges)
✅ **Social** (amis, comparaison, profils publics)
✅ **Notifications** (pronos, badges, amis, email)
✅ **Onboarding complet** (favoris, avatar)
✅ **Architecture scalable** (CRON + cache DB)

**Le système est prêt pour la production ! 🚀**
