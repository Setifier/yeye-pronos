# 🏆 Correction des Raretés des Badges - Logique de Difficulté

## Problème identifié

Les raretés des badges n'avaient aucune logique cohérente :
- 100 pronos = LEGENDARY
- 10,000 pronos = RARE

**C'était complètement inversé !**

---

## Nouvelle logique de rareté

### **COMMON** (19 badges) - Facile, accessible à tous
- Premiers pas (10-50 pronos de saison)
- Victoires carrière débutant (100 pronos)
- Séries courtes (5 consécutifs)
- Badges d'introduction
- **Objectif** : Donner satisfaction rapidement aux nouveaux joueurs

### **RARE** (19 badges) - Engagement régulier
- Victoires saison : 100-500 pronos
- Victoires carrière : 250-500 pronos
- Séries moyennes (10 consécutifs)
- Daily winrate 75% (8 matchs)
- Perfect daily (8 matchs)
- Top 100 général
- 50% winrate saison
- 1ère compétition gagnée
- **Objectif** : Récompenser l'engagement et la régularité

### **EPIC** (29 badges) - Très bon joueur
- Victoires saison : 750-1000 pronos
- Victoires carrière : 1000-2000 pronos
- Séries longues (15 consécutifs)
- Perfect daily (12 matchs)
- 75% winrate saison/favorite
- Top 25 général
- Semaine parfaite (80%)
- 3-10 compétitions gagnées
- 10 saisons participées
- **Objectif** : Distinguer les excellents joueurs

### **LEGENDARY** (13 badges) - Élite absolue
- Victoires carrière : 5000-10,000 pronos
- Séries exceptionnelles (25 consécutifs)
- 80% winrate saison/favorite
- Top 3 général
- Mois parfait (80% sur 100 pronos)
- 25+ compétitions gagnées
- 25 saisons participées
- **Objectif** : Marquer les accomplissements exceptionnels

---

## Badges modifiés (21 corrections)

### SEASON (5 badges)

| Badge | Ancien | Nouveau | Raison |
|-------|--------|---------|--------|
| Le Wilt (100 pronos) | COMMON | **RARE** | 100 pronos nécessite engagement |
| Chef Curry (15 streak) | RARE | **EPIC** | 15 consécutifs est très difficile |
| Cheat Code (25 streak) | EPIC | **LEGENDARY** | 25 consécutifs est quasi-impossible |
| Du bon vieux Tanking (0% 8 matchs) | RARE | **COMMON** | Badge "marrant", pas difficile |
| Le Mois de Légende (80% mois) | EPIC | **LEGENDARY** | 80% sur un mois entier est exceptionnel |

### END_SEASON (3 badges)

| Badge | Ancien | Nouveau | Raison |
|-------|--------|---------|--------|
| Maître de la Précision (80% saison) | EPIC | **LEGENDARY** | 80% sur 600 pronos est extrême |
| Voyance Fan Ultime (80% favorite) | EPIC | **LEGENDARY** | 80% avec son équipe = ultra-difficile |

### CAREER - Victoires totales (7 badges)

| Badge | Ancien | Nouveau | Raison |
|-------|--------|---------|--------|
| Centurion (100) | LEGENDARY | **COMMON** | 100 pronos = débutant |
| Stratège (250) | LEGENDARY | **RARE** | 250 pronos = joueur régulier |
| Maître (500) | LEGENDARY | **RARE** | 500 pronos = bon joueur |
| Légende (1000) | LEGENDARY | **EPIC** | 1000 pronos = excellent joueur |
| Dieu (5000) | EPIC | **LEGENDARY** | 5000 pronos = élite |
| Immortel (10000) | RARE | **LEGENDARY** | 10,000 pronos = absolu |

### CAREER - Compétitions (6 badges)

| Badge | Ancien | Nouveau | Raison |
|-------|--------|---------|--------|
| Vainqueur Public (1) | EPIC | **RARE** | 1ère victoire = bon mais pas exceptionnel |
| Dominateur Public (3) | RARE | **EPIC** | 3 victoires = excellence |
| Empereur Public (10) | COMMON | **EPIC** | 10 victoires = domination |
| Dynastie Publique (25) | EPIC | **LEGENDARY** | 25 victoires = légende |
| Champion Privé (1) | EPIC | **RARE** | 1ère victoire privée |
| Seigneur des Ligues (25) | EPIC | **LEGENDARY** | 25 ligues privées = absolu |

### CAREER - Saisons (2 badges)

| Badge | Ancien | Nouveau | Raison |
|-------|--------|---------|--------|
| Pilier Communauté (10 saisons) | COMMON | **EPIC** | 10 saisons = fidélité extrême |
| Ancêtre Fondateur (25 saisons) | EPIC | **LEGENDARY** | 25 saisons = légende vivante |

---

## Répartition finale par rareté

```
COMMON:    19 badges (23.75%) ⬜⬜⬜⬜⬜
RARE:      19 badges (23.75%) 🔵🔵🔵🔵🔵
EPIC:      29 badges (36.25%) 🟣🟣🟣🟣🟣🟣🟣
LEGENDARY: 13 badges (16.25%) 🟡🟡🟡🟡
```

### Distribution équilibrée :
- **47.5%** facile à obtenir (COMMON + RARE)
- **36.25%** difficile (EPIC)
- **16.25%** exceptionnel (LEGENDARY)

---

## Exemples de progression logique

### Victoires de saison (SEASON)
```
10 pronos   → Rookie              [COMMON]
25 pronos   → En sortie de banc   [COMMON]
50 pronos   → 6th Man             [COMMON]
100 pronos  → Le Wilt             [RARE]
250 pronos  → Dans le 5 majeur    [RARE]
500 pronos  → All-Star            [RARE]
750 pronos  → MVP                 [EPIC]
1000 pronos → Hall of Fame        [EPIC]
```

### Victoires totales (CAREER)
```
100 pronos   → Centurion             [COMMON]
250 pronos   → Stratège              [RARE]
500 pronos   → Maître                [RARE]
1000 pronos  → Légende               [EPIC]
2000 pronos  → Titan                 [EPIC]
5000 pronos  → Dieu du Basket        [LEGENDARY]
10000 pronos → L'Immortel            [LEGENDARY]
```

### Séries de victoires (SEASON)
```
5 consécutifs  → Dans la zone      [COMMON]
10 consécutifs → La Main Chaude    [RARE]
15 consécutifs → Chef Curry        [EPIC]
25 consécutifs → Cheat Code        [LEGENDARY]
```

### Winrate saison (END_SEASON)
```
50%+ → Régularité Solide       [RARE]
75%+ → Expert Confirmé         [EPIC]
80%+ → Maître de la Précision  [LEGENDARY]
```

---

## Impact sur le game design

### ✅ Avantages de la nouvelle logique

1. **Motivation progressive** : Les joueurs voient la progression logique
2. **Satisfaction immédiate** : COMMON accessibles rapidement
3. **Objectifs clairs** : Chaque rareté a un sens
4. **Prestige réel** : LEGENDARY = vraiment exceptionnel
5. **Équilibré** : Distribution 24% / 24% / 36% / 16%

### 🎯 Psychologie du joueur

- **COMMON** : "J'ai commencé !" → Engagement initial
- **RARE** : "Je suis régulier !" → Fidélité
- **EPIC** : "Je suis fort !" → Fierté
- **LEGENDARY** : "Je suis une légende !" → Statut ultime

---

## Script d'update

**Fichier créé** : `/prisma/update-badge-rarities.ts`

**Utilisation** :
```bash
npx tsx prisma/update-badge-rarities.ts
```

**Résultat** :
- ✅ 21 badges mis à jour
- ⚠️ 0 badges non trouvés
- ❌ 0 erreurs

---

## Backup

Un backup du seed original a été créé :
- `/prisma/seed-badges.ts.backup`

---

## Prochaines étapes

1. ✅ **Raretés corrigées** (FAIT)
2. 🔄 **Titres des badges** (à venir si besoin)
3. 🔄 **Points par rareté** (optionnel)
4. 🔄 **Icônes spéciales LEGENDARY** (optionnel)

---

**Date de correction** : 31 décembre 2024
**Statut** : ✅ CORRIGÉ ET DÉPLOYÉ
**Impact utilisateurs** : Les badges déjà débloqués conservent leur nouvelle rareté
