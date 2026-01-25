# 🚀 Quick Start - Système NBA Pronos (ESPN API)

## ⚡ Démarrage rapide (5 étapes)

### 1. Configurer les variables d'environnement

Ajoutez dans votre `.env` :

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# CRON Secret (générez avec: openssl rand -hex 32)
CRON_SECRET=your_random_secret_here
```

**✅ Pas de clé API nécessaire** : ESPN API est 100% gratuite !

### 2. Générer le client Prisma

```bash
npx prisma generate
```

### 3. Créer/Mettre à jour la base de données

```bash
npx prisma db push
```

### 4. Lancer les seeds

```bash
# Seed des équipes (si pas déjà fait)
npx tsx prisma/seed-teams.ts

# Seed des matchs ESPN (saison 2025-26)
npx tsx prisma/seed-espn.ts

# Seed des badges
npx tsx prisma/seed-badges.ts

# Seed des joueurs
npx tsx prisma/seed-players.ts
```

**⏱️ Durée totale** : ~15-20 minutes

**Ce qui va se passer** :
```
🚀 Seed NBA avec ESPN (VRAIES HEURES)

🏀 Chargement des équipes existantes...
✅ 30 équipes trouvées en DB
  ✅ Boston Celtics (BOS)
  ✅ Brooklyn Nets (BKN)
  ✅ Los Angeles Lakers (LAL)
  ... (30 équipes)

🏀 Seed des matchs NBA depuis ESPN...
📅 174 dates à traiter (saison 2025-26)

📅 20251021...
  📥 2 matchs trouvés
    ✅ BOS @ NYK - 2025-10-21T23:30:00Z
    ✅ LAL @ GSW - 2025-10-22T02:00:00Z

📅 20251022...
  📥 10 matchs trouvés
  ...

✅ 1230 matchs créés/mis à jour sur 174 dates
✨ Seed terminé avec succès !
```

### 5. Configurer les CRON (production uniquement)

Le fichier `vercel.json` est déjà configuré avec les 4 CRON jobs :

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-daily-games",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/update-live-scores",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/update-injuries",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

Sur Vercel, ces CRON se déclenchent automatiquement après déploiement.

## ✅ Vérifier que tout fonctionne

### 1. Vérifier les équipes en DB

```bash
npx prisma studio
```

➡️ Ouvrir `Team` : Vous devriez voir 30 équipes avec logos

### 2. Vérifier les matchs en DB

➡️ Ouvrir `Game` : Vous devriez voir ~1230 matchs
➡️ Vérifier que les `externalId` commencent par **401** (ESPN)

### 3. Tester l'API

```bash
# Tester avec une date de match NBA
curl "http://localhost:3000/api/games?date=2025-10-22"
```

Réponse attendue :
```json
{
  "games": [
    {
      "id": 401704923,
      "dbId": "uuid-here",
      "date": "2025-10-22T23:30:00.000Z",
      "status": "SCHEDULED",
      "home_team": {
        "id": 2,
        "name": "Celtics",
        "abbreviation": "BOS",
        ...
      },
      "visitor_team": {
        "id": 20,
        "name": "Lakers",
        "abbreviation": "LAL",
        ...
      },
      "home_team_score": null,
      "visitor_team_score": null,
      "currentPeriod": null,
      "gameClock": null
    }
  ]
}
```

### 4. Tester les CRON (en local)

```bash
# Refresh daily games
curl http://localhost:3000/api/cron/refresh-daily-games

# Update live scores
curl http://localhost:3000/api/cron/update-live-scores
```

Réponse attendue :
```json
{
  "success": true,
  "date": "2025-10-22",
  "totalGames": 10,
  "updated": 10,
  "finalized": 0,
  "standingsRecalculated": 0,
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

## 📋 Ce qui a été créé

### 1. Script de seed ESPN (`prisma/seed-espn.ts`)
- ✅ Charge les 30 équipes depuis la DB existante
- ✅ Charge tous les matchs de la saison 2025-26 depuis ESPN
- ✅ **Vraies heures des matchs** (timezone locale US)
- ✅ IDs ESPN (401xxx, 402xxx)
- ✅ Respecte un délai de 500ms entre requêtes
- ✅ Utilise `upsert` pour éviter les doublons
- ✅ Calcule automatiquement `predictionDeadline` (30min avant)

### 2. CRON Jobs (`/api/cron/*`)

#### refresh-daily-games (8h Paris)
- Récupère les matchs du jour depuis ESPN
- Synchronise avec la DB
- Crée/met à jour les matchs

#### update-live-scores (toutes les minutes) ⭐
- Met à jour scores en temps réel
- Calcule résultats des pronos quand match FINAL
- Attribue points (base + bonus margin + top scorer + combo)
- Recalcule standings NBA
- Envoie notifications
- Vérifie et attribue badges

#### update-injuries (toutes les 15 min)
- Synchronise statut joueurs blessés
- Source : API officielle NBA

#### daily-digest (lundis 9h Paris)
- Envoie récap hebdomadaire par email

### 3. Route API modifiée (`/api/games`)
- ✅ Lit depuis Prisma (pas d'appel ESPN côté user)
- ✅ Filtre par date locale US (Eastern Time)
- ✅ Inclut relations `homeTeam`, `awayTeam`
- ✅ Inclut pronos de l'utilisateur si authentifié
- ✅ Format compatible avec le frontend

### 4. Configuration
- ✅ `vercel.json` avec 4 CRON jobs
- ✅ `.env.example` mis à jour (pas de clé API)
- ✅ Documentation complète mise à jour

## 🎯 Prochaines étapes

Maintenant que les données NBA sont en place, testez :

1. **Interface de pronos**
   - Aller sur `/matchs`
   - Choisir une date avec des matchs
   - Cliquer "Pronostiquer" sur un match
   - Tester les bonus (écart de score + top scorer)

2. **Système de points**
   - Créer quelques pronos
   - Attendre qu'un match passe à FINAL
   - Vérifier que les points sont calculés automatiquement
   - Vérifier les bonus (margin, top scorer, combo)

3. **Classement**
   - Aller sur `/classement`
   - Vérifier votre position
   - Comparer avec d'autres utilisateurs

4. **Badges**
   - Créer plusieurs pronos
   - Gagner des matchs
   - Vérifier badges débloqués sur votre profil

## 📊 Architecture finale

```
┌──────────────────────────────────────────────────┐
│                ESPN API (GRATUITE)               │
│    http://site.api.espn.com/.../scoreboard      │
│         ✅ Pas de clé API nécessaire             │
│         ✅ Vraies heures                          │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Seed initial (1x, ~15 min)
                 │ └─> 30 équipes + 1230 matchs
                 │
                 │ CRON refresh-daily (8h Paris)
                 │ └─> Nouveaux matchs du jour
                 │
                 │ CRON update-live (1 min)
                 │ └─> Scores + pronos + badges
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│            PostgreSQL (Neon)                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐    │
│  │ Team │  │ Game │  │ User │  │Prediction│    │
│  └──────┘  └──────┘  └──────┘  └──────────┘    │
│                                                  │
│  externalId: "401704923" (ESPN)                  │
│  gameDate: vraie heure UTC                       │
│  localGameDate: heure locale US                  │
│  currentPeriod: 1-4 (ou 5+ si OT)                │
│  gameClock: "2:35"                               │
│  topScorer, scoreMargin, bonus...                │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Read only (rapide, 0 API call)
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│         Next.js API Routes + Frontend            │
│                                                  │
│  GET  /api/games?date=YYYY-MM-DD                │
│  POST /api/predictions                           │
│  GET  /api/leaderboard                          │
│  GET  /api/users/[id]/public-profile            │
└──────────────────────────────────────────────────┘
```

## 🛟 Problèmes fréquents

### Le seed échoue sur "Team not found"

➡️ Les équipes doivent être en DB avant :
```bash
npx tsx prisma/seed-teams.ts
# Puis relancer
npx tsx prisma/seed-espn.ts
```

### Certains matchs manquants

➡️ ESPN peut ne pas publier tous les matchs immédiatement :
- Relancer le seed quelques jours plus tard
- Le CRON `refresh-daily-games` ajoutera automatiquement les nouveaux matchs

### Les scores ne se mettent pas à jour

➡️ En local, les CRON ne tournent pas automatiquement :
- Tester manuellement : `curl http://localhost:3000/api/cron/update-live-scores`
- En prod Vercel : vérifier onglet "Cron" dans le dashboard

### Erreur "externalId already exists"

➡️ C'est normal, `upsert` gère les doublons. Si vraie erreur :
```bash
# Reset complet (⚠️ supprime tout)
npx prisma db push --force-reset
npx tsx prisma/seed-teams.ts
npx tsx prisma/seed-espn.ts
```

### Heures des matchs bizarres

➡️ C'est normal, ESPN renvoie les heures en UTC :
- `gameDate` = UTC (ex: 23:30 UTC = 18:30 EST)
- `localGameDate` = Heure locale US (ex: 18:30 EST)
- Frontend affiche en heure de Paris (ex: 00:30 CET)

### CRON ne se déclenche pas sur Vercel

➡️ Vérifications :
1. Onglet "Cron" : vérifier jobs actifs
2. Variables d'environnement : `CRON_SECRET` défini
3. Logs : voir erreurs
4. Plan : certaines fréquences nécessitent Vercel Pro

## 🔄 Migration depuis BallDontLie

Si vous aviez des anciens matchs BallDontLie (IDs 18446xxx, 18447xxx) :

```bash
# Nettoyer les anciens matchs
npx tsx prisma/cleanup-balldontlie-games.ts
```

Ce script :
- Supprime matchs avec `externalId` 18446* ou 18447*
- Supprime pronos orphelins
- **Préserve** tous les matchs ESPN (401*)

## 📚 Documentation complète

Pour plus de détails, consultez :

- **`SETUP-NBA-DATA.md`** : Setup complet avec troubleshooting
- **`NBA-SYSTEM-SUMMARY.md`** : Résumé du système complet
- **`prisma/seed-espn.ts`** : Code commenté du seed
- **`/api/cron/update-live-scores`** : Code commenté du CRON principal

## 🎉 C'est prêt !

Votre système NBA est maintenant configuré. Vous avez :

✅ **1230+ matchs** de la saison 2025-26 en DB
✅ **Vraies heures** des matchs (timezone locale US)
✅ **API ultra-rapide** (lecture Prisma, 0 appel externe)
✅ **Scores à jour** toutes les minutes
✅ **Points avec bonus** (margin + top scorer + combo)
✅ **Badges automatiques** (12 familles, 60+ badges)
✅ **Architecture scalable** pour des milliers d'utilisateurs

**Bon dev ! 🏀**
