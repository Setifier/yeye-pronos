# Scripts de maintenance NBA

## Production (CRON automatiques)

En production sur Vercel, **4 CRON jobs** gèrent tout automatiquement :

| CRON | Fréquence | Description |
|------|-----------|-------------|
| `refresh-daily-games` | 8h Paris | Détecte les matchs du jour |
| `update-live-scores` | Toutes les minutes | Scores + pronos + badges + standings + stats |
| `update-injuries` | Toutes les 15 min | Infirmerie NBA |
| `daily-digest` | Lundis 9h | Récap hebdo par email |

**Aucune intervention manuelle nécessaire** en production.

---

## Scripts principaux

### Synchronisation des données

| Script | Usage |
|--------|-------|
| `sync-espn-all-games.ts` | Sync complète matchs + stats |
| `sync-injuries.ts` | Sync des blessures |
| `backfill-game-stats.ts` | Stats joueurs uniquement |
| `update-scores-espn.ts` | Scores uniquement |

```bash
# Sync complète (matchs + stats)
npx tsx prisma/sync-espn-all-games.ts

# Sync blessures
npx tsx prisma/sync-injuries.ts

# Stats des matchs FINAL
npx tsx prisma/backfill-game-stats.ts

# Scores uniquement
npx tsx prisma/update-scores-espn.ts
```

**Options de sync-espn-all-games.ts :**
```bash
--from=2025-12-01    # Date de début
--to=2025-12-31      # Date de fin
--skip-stats         # Sans les stats (plus rapide)
```

**Options de backfill-game-stats.ts :**
```bash
--limit=10           # Limiter à N matchs
--from=2025-12-01    # Depuis cette date
--to=2025-12-31      # Jusqu'à cette date
```

---

### Seed initial

| Script | Usage |
|--------|-------|
| `seed-espn.ts` | Matchs de la saison |
| `seed-players.ts` | Joueurs NBA |
| `seed-badges.ts` | Badges (12 familles) |

```bash
# Setup complet
npx tsx prisma/seed-espn.ts
npx tsx prisma/seed-players.ts
npx tsx prisma/seed-badges.ts
```

---

### Vérification

| Script | Usage |
|--------|-------|
| `check-db-status.ts` | État complet de la DB |
| `check-standings-data.ts` | Stats équipes |
| `check-team-logos.ts` | Logos équipes |

```bash
# Diagnostic complet
npx tsx prisma/check-db-status.ts
```

---

### Calculs (rarement nécessaires)

Ces scripts ne sont utiles que pour un recalcul en masse (après reset DB ou bug).
**En fonctionnement normal, le CRON `update-live-scores` fait tout automatiquement.**

| Script | Usage |
|--------|-------|
| `calculate-all-player-stats.ts` | Recalculer TOUTES les moyennes joueurs |
| `update-scores-and-standings.ts` | Recalculer TOUS les standings équipes |

```bash
# Seulement si nécessaire (reset DB, bug...)
npx tsx prisma/calculate-all-player-stats.ts
npx tsx prisma/update-scores-and-standings.ts
```

---

### Mise à jour des assets

| Script | Usage |
|--------|-------|
| `update-team-logos.ts` | Logos équipes |
| `update-team-colors.ts` | Couleurs équipes |
| `fetch-player-headshots.ts` | Photos joueurs |
| `update-badge-rarities.ts` | Raretés des badges |

---

### Reset / Nettoyage

| Script | Usage |
|--------|-------|
| `reset-games.ts` | Supprimer tous les matchs |
| `reset-nba-data.ts` | Reset complet des données NBA |
| `clean-all-stats.ts` | Supprimer toutes les stats |
| `clear-players.ts` | Supprimer tous les joueurs |
| `delete-all-notifications.ts` | Supprimer toutes les notifs |

---

### Utilitaires

| Script | Usage |
|--------|-------|
| `generate-friend-codes.ts` | Générer codes amis manquants |
| `refetch-one-game.ts` | Re-sync un match spécifique |
| `fix-player-teams.ts` | Corriger équipes des joueurs |
| `fix-team-abbreviations.ts` | Corriger abréviations |

---

## Calculs automatiques

**Tout est calculé automatiquement** par les CRON, pas besoin de scripts manuels :

| Donnée | Calculé par | Quand |
|--------|-------------|-------|
| TeamSeasonStats (W/L, standings) | `update-live-scores` | Après chaque match FINAL |
| PlayerSeasonStats (PPG, RPG...) | `update-live-scores` | Après récupération des stats |
| Points des pronos | `update-live-scores` | Quand match passe à FINAL |
| Badges | `update-live-scores` | Après calcul des pronos |
| Blessures | `update-injuries` | Toutes les 15 minutes |

Les scripts `calculate-all-player-stats.ts` et `update-scores-and-standings.ts` ne servent qu'en cas de reset DB ou bug.

---

## Workflow recommandé

### Setup initial

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed-espn.ts
npx tsx prisma/seed-players.ts
npx tsx prisma/seed-badges.ts
npx tsx prisma/sync-injuries.ts
```

### Maintenance manuelle (si CRON down)

```bash
npx tsx prisma/sync-espn-all-games.ts
npx tsx prisma/sync-injuries.ts
npx tsx prisma/check-db-status.ts
```

### Récupérer des stats manquantes

```bash
npx tsx prisma/backfill-game-stats.ts --from=2025-12-01
```

---

## Test des CRON en local

```bash
curl http://localhost:3000/api/cron/update-live-scores
curl http://localhost:3000/api/cron/refresh-daily-games
curl http://localhost:3000/api/cron/update-injuries
```

---

## API source

**ESPN API** (gratuite, sans clé) :
- Matchs : `http://site.api.espn.com/.../scoreboard`
- Stats : `http://site.api.espn.com/.../summary?event={id}`
- Blessures : `http://site.api.espn.com/.../injuries`

IDs des matchs : **401xxxxxx**
