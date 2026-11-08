# Démarrer une nouvelle saison

La saison courante est calculée automatiquement (`getCurrentSeason()` dans `src/types/season.ts`) :
d'octobre à septembre, c'est la même saison (oct. 2026 → sept. 2027 = `"2026-27"`).
Aucune date de saison n'est codée en dur dans l'application.

## Checklist (à faire en septembre, ou dès que possible si la saison a commencé)

| # | Commande | Rôle |
|---|---|---|
| 1 | `npm run db:verify-season -- --quick` | Vérifie les 30 équipes, divisions, logos |
| 2 | `npm run db:update-rosters` | Effectifs à jour après la free agency (rookies, transferts, agents libres) |
| 3 | `npm run db:seed-espn` | Calendrier complet de la saison (≈ 3 min) |
| 4 | `npm run db:run-update -- --days=10` | Traite les matchs déjà joués : box scores, pronos, moyennes, classement |
| 5 | *(automatique)* | Groupes de la NBA Cup : attribués par la mise à jour quotidienne dès que les 60 matchs de poule sont en base (`npm run db:backfill-nba-cup -- --skip-scan` pour forcer) |
| 6 | `npm run db:update-injuries` | Infirmerie |
| 7 | `npm run db:verify-season` | Contrôle complet DB vs ESPN — doit finir sur « Tout est cohérent » |
| 8 | Vercel → onglet **Cron** | Vérifier que `morning-update` est actif et que les logs sont propres |
| 9 | Cotes des trophées | Ajouter la saison dans `AWARD_RANKINGS` (`src/lib/award-odds.ts`) **avant l'ouverture des paris** : vote MVP puis All-NBA, vote DPOY puis All-Defensive, ordre de la draft de l'été (source : basketball-reference.com). Sans cette entrée, MVP et DPOY valent 1 000 pts pour tous et le pari Rookie n'a aucun candidat |
| 10 | Paris de début de saison | Ils ferment automatiquement au coup d'envoi du 1er match. `PRESEASON_DEADLINES` ne sert qu'aux exceptions (ex. 2026-27) |
| 11 | `npm run check:setup` | Variables d'environnement, SMTP, base, date limite |

Ensuite tout est automatique (voir [SCRIPTS.md](./SCRIPTS.md)). En cas de doute, relancer
`npm run db:verify-season` : chaque erreur indique la commande qui la corrige.

## Rattrapage 2026-27 (situation au 25 octobre 2026)

La saison a commencé le 20 octobre alors que la base était encore sur 2025-26.
Ordre exact à lancer :

```bash
npm run db:update-rosters
npm run db:seed-espn
npm run db:run-update -- --days=10
npm run db:backfill-nba-cup -- --skip-scan
npm run db:verify-season
```

## Calendrier 2026-27 (relevé sur ESPN le 23/10/2026)

| Période | Dates |
|---|---|
| Présaison (non importée) | 3 → 16 octobre 2026 |
| **Soirée d'ouverture** | **mardi 20 octobre 2026** (BOS @ DET, PHI @ NYK, OKC @ SAS) |
| **NBA Cup — 1er match de poule** | **vendredi 30 octobre 2026** |
| NBA Cup — phase de groupes | 30 oct., 6, 13, 20, 24, 25 et 27 nov. |
| Pas de match | 3 nov. (élections US), 26 nov. (Thanksgiving), 24 déc. |
| Match NBA à Mexico | 7 nov. — DEN @ IND |
| NBA Cup — quarts de finale | 4 et 5 déc. (horaires ESPN encore provisoires) |
| NBA Cup — demi-finales | 8 déc. (provisoire) |
| NBA Cup — finale | 11 déc. (provisoire) — ne compte pas au classement |
| **NBA Paris Game** | **jeudi 14 janvier 2027** — NOP @ SAS, 20h00 heure de Paris |
| Match NBA à Manchester | 17 janvier 2027 — SAS @ NOP |
| Pause All-Star | 19 → 24 février 2027 |
| Dernier jour de saison régulière | 11 avril 2027 |
| Play-in, playoffs, Finales | pas encore publiés par ESPN |

**Règle officielle** : les paris de début de saison ferment au **coup d'envoi du premier match** de la saison régulière.

**Exception 2026-27 uniquement** (lancement de la bêta en cours de saison) : tous fermés le
**dimanche 15 novembre 2026 à 23h59** (heure de Paris), NBA Cup comprise. À ne pas reconduire.
