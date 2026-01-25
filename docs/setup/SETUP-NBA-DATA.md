# 🏀 Setup des données NBA

Ce guide explique comment configurer et maintenir les données NBA dans votre application avec **ESPN API**.

## 📋 Table des matières

1. [Configuration initiale](#configuration-initiale)
2. [Seed de la base de données](#seed-de-la-base-de-données)
3. [CRON Jobs pour mise à jour automatique](#cron-jobs-pour-mise-à-jour-automatique)
4. [Architecture](#architecture)
5. [Migration depuis BallDontLie](#migration-depuis-balldontlie)

## Configuration initiale

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# CRON Secret (générer avec: openssl rand -hex 32)
CRON_SECRET=your_random_secret_here
```

**Note** : ESPN API est gratuite et ne nécessite **AUCUNE clé API** ! 🎉

### 2. Générer le client Prisma

```bash
npx prisma generate
```

### 3. Créer les tables

```bash
npx prisma db push
```

## Seed de la base de données

### Qu'est-ce qui est seedé ?

Le script de seed (`prisma/seed-espn.ts`) va :

1. **Charger les 30 équipes NBA depuis la DB existante**
   - Nom, ville, abréviation
   - Conférence (East/West)
   - Division, logos

2. **Charger tous les matchs de la saison 2025-26 depuis ESPN**
   - ~1,230 matchs (82 matchs × 30 équipes / 2)
   - **Vraies heures des matchs** (contrairement à BallDontLie)
   - Dates locales US par timezone d'équipe
   - Status (SCHEDULED, LIVE, FINAL, etc.)
   - IDs ESPN (commencent par **401xxx**)

### Exécuter le seed

```bash
npm run db:seed-espn
# ou
npx tsx prisma/seed-espn.ts
```

**Durée** : ~10-15 minutes (500ms entre requêtes, beaucoup plus rapide que BallDontLie)

### Ce qui se passe pendant le seed

```
🚀 Seed NBA avec ESPN (VRAIES HEURES)

🏀 Chargement des équipes existantes...
✅ 30 équipes trouvées en DB
  ✅ Boston Celtics (BOS)
  ✅ Brooklyn Nets (BKN)
  ...

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

### Re-seeder

Le seed utilise `upsert`, donc vous pouvez le relancer sans créer de doublons. C'est utile pour :
- Mettre à jour les données existantes
- Ajouter de nouveaux matchs en cours de saison
- Corriger les scores après modification

## CRON Jobs pour mise à jour automatique

### Pourquoi des CRON Jobs ?

Le système utilise **4 CRON jobs** pour maintenir les données à jour :

1. **refresh-daily-games** : Détecte les matchs du jour
2. **update-live-scores** : Met à jour scores et calcule pronos en temps réel
3. **update-injuries** : Synchronise l'infirmerie NBA
4. **daily-digest** : Envoie récap hebdo par email

### Configuration Vercel

Fichier `vercel.json` à la racine :

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-daily-games",
      "schedule": "0 7 * * *",
      "comment": "Tous les jours à 8h Paris (7h UTC) - Détection des matchs du jour"
    },
    {
      "path": "/api/cron/update-live-scores",
      "schedule": "* * * * *",
      "comment": "Toutes les minutes - Mise à jour scores live + standings + pronos"
    },
    {
      "path": "/api/cron/update-injuries",
      "schedule": "*/15 * * * *",
      "comment": "Toutes les 15 minutes - Mise à jour infirmerie NBA"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 8 * * 1",
      "comment": "Lundis à 9h Paris (8h UTC) - Récapitulatif hebdomadaire par email"
    }
  ]
}
```

### Détails des CRON Jobs

#### 1. **refresh-daily-games** (8h Paris)
- Récupère tous les matchs du jour depuis ESPN
- Synchronise avec la base de données
- Crée les matchs manquants, met à jour les existants

**Route** : `/api/cron/refresh-daily-games`
**Fréquence** : 1x par jour

#### 2. **update-live-scores** (toutes les minutes)
- Récupère scores en temps réel depuis ESPN
- Met à jour status (SCHEDULED → LIVE → FINAL)
- Calcule résultats des pronos quand match terminé
- Attribue points de base + bonus (margin, top scorer, combo)
- Recalcule standings NBA
- Envoie notifications (match terminé, prono gagné/perdu)
- Vérifie et attribue badges

**Route** : `/api/cron/update-live-scores`
**Fréquence** : Toutes les 1 minute
**Charge** : ~5-15 matchs par jour en moyenne

#### 3. **update-injuries** (toutes les 15 min)
- Synchronise statut des joueurs blessés
- Source : API officielle NBA

**Route** : `/api/cron/update-injuries`
**Fréquence** : Toutes les 15 minutes

#### 4. **daily-digest** (lundis 9h Paris)
- Envoie récapitulatif hebdomadaire par email
- Stats de la semaine, classement, badges

**Route** : `/api/cron/daily-digest`
**Fréquence** : Lundis uniquement

### Sécurité des CRON

Tous les CRON sont protégés par `CRON_SECRET` :

```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Test manuel** :
```bash
curl -X GET https://your-app.com/api/cron/update-live-scores \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Architecture

### Flux de données

```
┌─────────────────────────────────────────────┐
│            ESPN API (GRATUITE)              │
│    http://site.api.espn.com/.../scoreboard │
│         ✅ Pas de clé API nécessaire        │
│         ✅ Vraies heures des matchs          │
│         ✅ Pas de rate limit strict          │
└──────────┬──────────────────────────────────┘
           │
           │ [1] Seed initial (1x, ~10-15min)
           │     └─> 30 équipes + 1230 matchs saison 2025-26
           │
           │ [2] CRON refresh-daily-games (8h Paris)
           │     └─> Détection nouveaux matchs
           │
           │ [3] CRON update-live-scores (1 min)
           │     └─> Scores + pronos + badges + standings
           │
           ▼
┌─────────────────────────────────────────────┐
│      PostgreSQL (Neon)                      │
│                                             │
│  Team (30) ←──┐                             │
│               │                             │
│  Game (1230+) ┼─── externalId: "401xxx"    │
│               │    (ESPN IDs)               │
│  Prediction ──┤                             │
│               │                             │
│  User ────────┘                             │
└──────────┬──────────────────────────────────┘
           │
           │ [4] API Routes (lecture seule)
           │     └─> 0 appel externe, ultra rapide
           │
           ▼
┌─────────────────────────────────────────────┐
│       Frontend Next.js                      │
│                                             │
│  - Affichage des matchs                    │
│  - Système de pronos avec bonus            │
│  - Classement temps réel                   │
│  - Badges et achievements                  │
└─────────────────────────────────────────────┘
```

### Avantages ESPN vs BallDontLie

| Critère | BallDontLie (ancien) | ESPN (actuel) |
|---------|---------------------|---------------|
| **Clé API** | ❌ Requise | ✅ Aucune |
| **Rate limit** | ⚠️ 5 req/min | ✅ Souple |
| **Heures matchs** | ❌ Fausses (00:00 UTC) | ✅ Vraies heures |
| **IDs matchs** | 18446xxx, 18447xxx | 401xxx, 402xxx |
| **Données temps réel** | ⚠️ Lentes | ✅ Rapides |
| **Fiabilité** | ⚠️ Moyenne | ✅ Excellente |
| **Stats joueurs** | ❌ Non | ✅ Oui (box scores) |
| **Coût** | Gratuit (limité) | 100% gratuit |

### Modèle de données

```prisma
Team {
  externalId    String  @unique  // ID ESPN (ex: "1" pour ATL)
  name          String            // "Celtics"
  city          String            // "Boston"
  abbreviation  String  @unique  // "BOS"
  conference    Conference        // EAST / WEST
  division      String            // "Atlantic"
  logoUrl       String            // URL du logo
}

Game {
  externalId    String  @unique  // ID ESPN (ex: "401704923")
  season        String            // "2025-26"
  gameDate      DateTime          // UTC (vraie heure)
  localGameDate DateTime          // Heure locale US (timezone équipe)
  status        GameStatus        // SCHEDULED, LIVE, FINAL
  homeTeam      Team              // Relation
  awayTeam      Team              // Relation
  homeScore     Int?
  awayScore     Int?
  winnerId      String?           // Team.id du gagnant
  predictionDeadline DateTime      // 30min avant le match
  currentPeriod Int?              // 1-4 (ou 5+ si OT)
  gameClock     String?           // "2:35" (temps restant)

  // 🆕 Champs bonus
  topScorerId        String?     // Meilleur marqueur
  topScorerPoints    Int?        // Points du top scorer
  actualScoreMargin  Int?        // Écart de score
  scoreMarginCategory String?    // "CLOSE", "MEDIUM", "BLOWOUT", "OVERTIME"
  hasOvertime        Boolean     // Match avec prolongation
}
```

## Commandes utiles

```bash
# Seed ESPN (saison 2025-26)
npx tsx prisma/seed-espn.ts

# Sync complète (matchs + stats)
npx tsx prisma/sync-espn-all-games.ts

# Générer le client Prisma
npx prisma generate

# Reset complet de la DB (⚠️ supprime tout)
npx prisma db push --force-reset

# Voir les données dans Prisma Studio
npx prisma studio

# Vérifier l'état de la DB
npx tsx prisma/check-db-status.ts

# Tester le CRON en local
curl http://localhost:3000/api/cron/refresh-daily-games
curl http://localhost:3000/api/cron/update-live-scores
```

Voir [SCRIPTS.md](../SCRIPTS.md) pour la liste complète.

## Troubleshooting

### Erreur "Team not found" pendant le seed

➡️ Vérifier que les équipes sont déjà en DB :
```bash
npx prisma studio
# Ouvrir table "Team", vérifier 30 équipes
```

Si les équipes manquent, les créer d'abord (voir script `prisma/seed-teams.ts`).

### Matchs manquants

➡️ ESPN peut ne pas avoir tous les matchs immédiatement :
- Relancer le seed après quelques jours
- Le CRON `refresh-daily-games` ajoutera automatiquement les nouveaux matchs

### Scores pas à jour

➡️ Vérifier que le CRON `update-live-scores` tourne :
- Logs Vercel : Onglet "Cron" dans le dashboard
- Tester manuellement :
  ```bash
  curl -X GET https://your-app.com/api/cron/update-live-scores \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- Vérifier `CRON_SECRET` dans `.env`

### Heures des matchs incorrectes

➡️ C'est probablement dû à la timezone :
- `gameDate` = UTC (heure universelle)
- `localGameDate` = Heure locale US (timezone de l'équipe à domicile)
- Frontend affiche `localGameDate` converti en heure de Paris

### CRON Jobs ne se déclenchent pas

➡️ Vérifications Vercel :
1. Onglet "Cron" : vérifier que les jobs sont actifs
2. Logs : voir les erreurs d'exécution
3. `CRON_SECRET` bien défini dans les variables d'environnement
4. Plan Vercel : les CRON nécessitent au moins le plan Pro pour certaines fréquences

## Optimisations futures

1. **Cache Redis** : Pour éviter de query Prisma trop souvent
2. **Webhooks ESPN** : Si ESPN propose des webhooks (à investiguer)
3. **Delta updates** : Ne mettre à jour que les matchs LIVE (pas tous les matchs)
4. **Compression** : Utiliser `brotli` pour les réponses API
5. **CDN** : Cache des logos d'équipes via CDN
6. **Queue system** : Pour les notifications (éviter surcharge)

## Références

- [ESPN API Unofficial Docs](https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c)
- [Prisma Seeding](https://www.prisma.io/docs/guides/database/seed-database)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [NBA Timezones](https://www.nba.com/) - Référence officielle
