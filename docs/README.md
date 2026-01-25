# Documentation NBA Pronos

## Vue d'ensemble

Application de pronostics NBA utilisant **ESPN API** (gratuite, sans clé).

- IDs matchs ESPN : `401xxxxxx`
- Scores mis à jour toutes les minutes
- Stats joueurs disponibles (box scores)
- Calculs automatiques (standings, moyennes, badges)

---

## Guides essentiels

### Pour commencer

| Guide | Description |
|-------|-------------|
| [Quick Start](./setup/QUICK-START-NBA.md) | Démarrage rapide (5 étapes) |
| [Setup NBA Data](./setup/SETUP-NBA-DATA.md) | Configuration complète |
| [Scripts](./SCRIPTS.md) | Scripts de maintenance |

### Référence système

| Guide | Description |
|-------|-------------|
| [NBA System Summary](./guides/NBA-SYSTEM-SUMMARY.md) | Architecture complète |
| [Authentication](./guides/AUTHENTICATION-GUIDE.md) | Système d'auth (Better Auth) |

### Setup spécifiques

| Guide | Description |
|-------|-------------|
| [Seed Players](./setup/SEED-PLAYERS-GUIDE.md) | Import des joueurs |
| [Logos Setup](./setup/LOGOS-SETUP.md) | Configuration des logos |

### Architecture technique

| Guide | Description |
|-------|-------------|
| [Badge Families](./architecture/BADGE-FAMILIES.md) | Système de badges (12 familles) |
| [Badge Display](./architecture/BADGE-DISPLAY-IMPLEMENTATION.md) | Affichage des badges |
| [Badge Rarities](./architecture/BADGE-RARITIES-FIXED.md) | Raretés des badges |
| [Cookie Cache](./architecture/COOKIECACHE-ANALYSIS.md) | Cache Better Auth |

---

## CRON Jobs (production)

| CRON | Fréquence | Rôle |
|------|-----------|------|
| `refresh-daily-games` | 8h Paris | Détecte les matchs du jour |
| `update-live-scores` | 1 minute | Scores + pronos + badges + standings |
| `update-injuries` | 15 minutes | Infirmerie NBA |
| `daily-digest` | Lundis 9h | Récap hebdomadaire email |

Voir [SCRIPTS.md](./SCRIPTS.md) pour les scripts manuels.

---

## Structure

```
docs/
├── README.md              # Ce fichier
├── SCRIPTS.md             # Scripts de maintenance
├── setup/                 # Guides d'installation
│   ├── QUICK-START-NBA.md
│   ├── SETUP-NBA-DATA.md
│   ├── SEED-PLAYERS-GUIDE.md
│   └── LOGOS-SETUP.md
├── guides/                # Guides fonctionnels
│   ├── NBA-SYSTEM-SUMMARY.md
│   └── AUTHENTICATION-GUIDE.md
└── architecture/          # Documentation technique
    ├── BADGE-FAMILIES.md
    ├── BADGE-DISPLAY-IMPLEMENTATION.md
    ├── BADGE-RARITIES-FIXED.md
    └── COOKIECACHE-ANALYSIS.md
```

---

## Liens utiles

- **README principal** : `/README.md`
- **Changelog** : `/CHANGELOG.md`
- **Prisma Studio** : `npx prisma studio`

---

## Maintenir la documentation

Quand tu ajoutes une fonctionnalité :

1. **Setup/Installation** → `docs/setup/`
2. **Guide fonctionnel** → `docs/guides/`
3. **Architecture/Technique** → `docs/architecture/`
4. Mettre à jour ce README si nouveau guide
