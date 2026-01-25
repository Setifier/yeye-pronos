# 🏀 Guide : Import des joueurs NBA

## Vue d'ensemble

Deux scripts disponibles pour importer **tous les joueurs NBA** (saison 2025-2026) :

1. **ESPN API** (`seed-players.ts`) - Gratuit, pas de clé API
2. **BallDontLie API** (`seed-players-balldontlie.ts`) - Plus complet, nécessite clé API gratuite

---

## Option 1 : ESPN API (Recommandé pour commencer)

### Avantages
- ✅ **Gratuit** sans clé API
- ✅ Données officielles ESPN
- ✅ Rosters à jour

### Inconvénients
- ⚠️ Rate limiting plus strict
- ⚠️ Format de réponse parfois variable

### Usage

```bash
npx tsx prisma/seed-players.ts
```

### Ce que ça fait
- Fetch le roster de chaque équipe (30 équipes)
- Récupère : nom, prénom, poste, numéro
- Crée/Update ~450 joueurs en DB
- Pause de 500ms entre chaque équipe (éviter rate limit)

---

## Option 2 : BallDontLie API (Plus fiable)

### Avantages
- ✅ **Plus complet** (~500+ joueurs actifs)
- ✅ API stable et bien documentée
- ✅ Format uniforme

### Inconvénients
- ⚠️ Nécessite clé API (gratuite)
- ⚠️ Limite : 60 requêtes/minute (largement suffisant)

### Setup

1. **Créer un compte** : https://www.balldontlie.io/
2. **Obtenir clé API** (gratuite, pas de CB)
3. **Ajouter au `.env`** :
   ```env
   BALLDONTLIE_API_KEY=your_api_key_here
   ```

### Usage

```bash
npx tsx prisma/seed-players-balldontlie.ts
```

### Ce que ça fait
- Récupère TOUS les joueurs actifs (pagination automatique)
- Associe aux équipes par abbreviation
- Crée/Update ~500 joueurs en DB

---

## Recommandation

**→ Utiliser ESPN** (`seed-players.ts`)
- Pas besoin de clé API
- Données officielles ESPN
- ~450 joueurs (suffisant)

**Note** : Le script BallDontLie existe mais n'est plus recommandé car tout le système utilise maintenant ESPN.

---

## Après le seed

### Vérifier les données

```sql
-- Compter les joueurs
SELECT COUNT(*) FROM players;

-- Joueurs par équipe
SELECT t.abbreviation, COUNT(p.id) as player_count
FROM teams t
LEFT JOIN players p ON p."teamId" = t.id
GROUP BY t.abbreviation
ORDER BY player_count DESC;

-- Joueurs sans équipe
SELECT * FROM players WHERE "teamId" IS NULL;
```

### Résultat attendu
- **Total** : 450-500 joueurs
- **Par équipe** : 15-17 joueurs en moyenne
- **Sans équipe** : 0 (ou quelques free agents)

---

## Structure des données

Chaque joueur contient :

```typescript
{
  id: "uuid",
  externalId: "1234" ou "balldontlie-1234",
  firstName: "LeBron",
  lastName: "James",
  fullName: "LeBron James",  // Pour recherche facile
  position: "F" | "G" | "C" | "F-G" | etc.,
  jerseyNumber: "23",
  teamId: "uuid",
  isInjured: false,          // À jour via CRON infirmerie
  injuryStatus: null,
  injuryNote: null,
  injuryReturnDate: null,
}
```

---

## Mise à jour des rosters

### CRON quotidien (à créer plus tard)
```typescript
// Pseudo-code
async function updateRosters() {
  // Tous les jours à 6h du matin
  // 1. Fetch nouveaux rosters
  // 2. Update joueurs existants
  // 3. Créer nouveaux joueurs (trades, call-ups)
  // 4. Marquer joueurs libérés (teamId = null)
}
```

---

## Gestion des cas particuliers

### Joueurs tradés
- CRON détectera le changement d'équipe
- Update automatique du `teamId`

### Joueurs blessés
- Seed initial : `isInjured = false`
- CRON infirmerie mettra à jour (Phase 3)

### Two-way contracts
- Seront dans le roster de l'équipe NBA
- Position peut inclure "Two-Way"

### Joueurs G-League
- Normalement pas dans les rosters NBA
- Si présents, seront importés

---

## Prochaines étapes

Après le seed des joueurs :

1. ✅ **Phase 2 complétée** : Joueurs en DB
2. 🔄 **Phase 3** : CRON infirmerie (update blessures quotidien)
3. 🔄 **Phase 4** : CRON stats joueurs (après chaque match)
4. 🔄 **Phase 5** : Service calcul bonus
5. 🔄 **Phase 6** : UI Modal prono
6. 🔄 **Phase 7** : Pages /joueurs et /joueurs/infirmerie

---

## Troubleshooting

### "Équipe non trouvée"
- Vérifier que les 30 équipes sont bien en DB
- Vérifier les `abbreviation` matchent (ATL, BOS, etc.)

### Rate limit ESPN
- Augmenter la pause entre équipes (500ms → 1000ms)
- Relancer le script (il update sans dupliquer)

### BallDontLie API Key invalide
- Vérifier `.env` : `BALLDONTLIE_API_KEY=...`
- Pas d'espaces, pas de quotes
- Clé active sur balldontlie.io

---

**Recommandation finale** : Commence avec ESPN, passe à BallDontLie si besoin.
