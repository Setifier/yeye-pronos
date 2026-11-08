# CRON et scripts de maintenance

Toute la logique de données est dans `src/lib/` et partagée entre le CRON et les scripts :
un script manuel fait **exactement** la même chose que le CRON, sans limite de temps.

| Bibliothèque | Rôle |
|---|---|
| `src/lib/game-sync.ts` | Calendrier ESPN → `Game` (création, horaires, scores, reports, séries, NBA Cup) |
| `src/lib/game-processing.ts` | Matchs terminés → box scores, pronos, moyennes, classement, séries |
| `src/lib/roster-sync.ts` | 30 rosters + infirmerie → `Player`, `InjuryReport` |
| `src/lib/player-odds.ts` | Moyenne de référence pour la cote du meilleur marqueur |
| `src/lib/standings-calculator.ts` | Bilans des équipes (`TeamSeasonStats`) |
| `src/lib/calculate-player-season-stats.ts` | Moyennes saison (`PlayerSeasonStats`) |

## CRON (production, Vercel)

Vercel Hobby : jusqu'à 100 CRON par projet, mais **chacun au plus une fois par jour**, déclenché à un
moment quelconque dans l'heure prévue. Le CRON du matin fait tout ; celui du soir rafraîchit les blessures
avant les matchs.

| CRON | Planning (`vercel.json`) | Contenu |
|---|---|---|
| `/api/cron/morning-update` | `0 8 * * *` → **09h00 heure de Paris** (10h00 en heure d'été) | Calendrier J-3 → J+7 · matchs terminés (pronos, stats) · classement · séries · effectifs · blessures |
| `/api/cron/update-injuries` | `0 21 * * *` → **22h-23h heure de Paris** (23h-00h en été) = 16h-17h à New York | Effectifs + blessures, avant les premiers coups d'envoi de 19h ET (les matchs du week-end en journée ne sont pas couverts) |

**Pourquoi 08:00 UTC.** Vercel planifie en UTC et ne suit pas les changements d'heure :

| Période | Heure de Paris | Dernier match fini vers* | Marge |
|---|---|---|---|
| Heure d'hiver (25 oct. 2026 → 28 mars 2027) | 09h00 | 07h15 | ~1h45 |
| Heure d'été (28 mars → fin de saison) | 10h00 | 07h15 | ~2h45 |

\* Coup d'envoi le plus tardif : 22h30 ET, fin vers 01h15 ET avec prolongation.
Sur le plan Hobby, Vercel déclenche le CRON à un moment quelconque **dans l'heure** (08:00–08:59 UTC).

**Dates.** Les matchs traités ce matin-là portent la date US Eastern de **la veille** :
un match du 25 octobre à 22h30 ET se joue le 26 à 03h30 à Paris, mais il est rangé au 25.
Toute l'application suit cette convention (date US Eastern pour le jour, heure de Paris pour
l'affichage) — voir [DONNEES-NBA.md](./DONNEES-NBA.md#règles-dimport-calendrier).

Le traitement des matchs s'arrête à ~38 s (limite Vercel de 60 s) ; s'il reste des matchs,
ils sont repris au passage suivant et `remaining` l'indique dans la réponse.

**Région.** Les fonctions tournent à Londres (`"regions": ["lhr1"]` dans `vercel.json`), comme la base
Neon (eu-west-2) : une requête SQL y coûte quelques millisecondes, contre ~80 ms depuis Washington
(région Vercel par défaut). Un match traité ≈ une centaine de requêtes : c'est ce qui permet de passer
une nuit de 15 matchs dans le budget. Ne pas changer l'un sans l'autre.

**Alerte.** Quand un passage reste incomplet (matchs non traités, box score absent, erreur ESPN,
effectifs incomplets, exécution > 50 s ou plantage), un e-mail part vers `ADMIN_EMAILS`.
Aucun e-mail quand tout va bien. La réponse JSON contient `ok` et `problems`.

### Scores en direct (optionnel)

Sans plan payant, les scores ne se mettent à jour qu'une fois par jour. Pour du direct, faire
appeler `/api/cron/update-live-scores` toutes les 5 min pendant les matchs par un service
gratuit (ex. cron-job.org, de 23h à 7h heure de Paris) avec le header
`Authorization: Bearer <CRON_SECRET>`. Même logique que le CRON du matin, limitée à la veille
et au jour en cours.

### Depuis l'admin

Pages **Santé** (`/admin/dashboard`) et **Matchs** (`/admin/games`) : mêmes tâches que les CRON, sans terminal
(60 s max, comme sur Vercel). Chaque passage, automatique ou manuel, est enregistré (table `CronRun`, 60 jours)
et visible avec son journal dans l'historique.

| Bouton | Effet |
|---|---|
| Lancer la mise à jour | Tout le pipeline du matin |
| Blessures | Effectifs + blessures |
| Recalculer le classement | Bilans + rangs des 30 équipes |
| Mettre à jour cette nuit | Calendrier et matchs terminés d'une nuit |
| Retraiter | Un match : pronos remis en attente puis recalculés, box score, moyennes, classement |

Restent en commandes : les gros rattrapages (`db:backfill-*`, `db:run-update -- --days=N`) et le contrôle
complet avec ESPN (`db:verify-season`), trop longs pour 60 s.

### Routes déclenchables à la main

Toutes exigent `Authorization: Bearer $CRON_SECRET`.

| Route | Effet |
|---|---|
| `/api/cron/morning-update` | Tout le pipeline quotidien |
| `/api/cron/update-live-scores` | Calendrier J-1 → J + matchs terminés |
| `/api/cron/refresh-daily-games` | Calendrier J-1 → J+7 uniquement |
| `/api/cron/update-injuries` | Effectifs + blessures |
| `/api/cron/sync-trades` | Effectifs seuls (transferts, signatures, agents libres) |
| `POST /api/admin/recalculate-standings` | Classement complet (session admin requise) |

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/morning-update
```

## Scripts du quotidien

| Commande | Rôle | Options |
|---|---|---|
| `npm run db:run-update` | Équivalent manuel du CRON du matin | `--days=N` (fenêtre J-N, défaut 3) · `--no-sync` · `--no-rosters` · `--season=` |
| `npm run db:verify-season` | Contrôle complet DB vs ESPN (équipes, effectifs, calendrier, horaires, classement, stats, NBA Cup, blessures). Indique la commande qui corrige chaque erreur | `--quick` (sans ESPN) · `--season=` · `--from= --to=` |
| `npm run db:update-rosters` | Effectifs (transferts, rookies, two-way, agents libres) | `--no-free-agents` |
| `npm run db:update-injuries` | Effectifs + infirmerie, puis liste des blessés | — |

## Mise en ligne

| Commande | Rôle |
|---|---|
| `npm run check:setup` | Variables d'environnement, URL d'auth, base, SMTP (sans envoi), date limite des paris de saison. Voir [LANCEMENT-BETA.md](./LANCEMENT-BETA.md) |

## Scripts de début de saison

Voir la checklist dans [NOUVELLE-SAISON.md](./NOUVELLE-SAISON.md).

| Commande | Rôle | Options |
|---|---|---|
| `npm run db:seed-espn` | Calendrier complet (1er oct. → 30 juin), idempotent | `--season=` · `--from= --to=` |
| `npm run db:backfill-nba-cup` | Tours + groupes NBA Cup | `--season=` · `--dry-run` · `--skip-scan` |
| `npm run db:seed-players` | Alias de la synchro effectifs + blessures | — |

## Recalculs (après un bug ou une correction de données)

| Commande | Rôle |
|---|---|
| `npm run db:recalculate-standings` | Bilans des 30 équipes + rangs conférence/division (`--team=ABBR` pour une seule, `--season=`) |
| `npm run db:recalculate-player-stats` | Moyennes de tous les joueurs de la saison |
| `npm run db:backfill-boxscore-stats` | Re-télécharge les box scores de la saison régulière |
| `npm run db:cleanup-player-stats` | Supprime les lignes DNP et les joueurs fantômes, puis recalcule |
| `npm run db:backfill-standings` | Corrige les statuts des matchs passés puis recalcule le classement |
| `npm run db:import-standings` | Importe le classement final ESPN (archivage de fin de saison) |
| `npm run db:fix-season-format` | Matchs à saison mal formatée (« 2025 ») : doublon supprimé ou saison corrigée. Aperçu, puis `--apply` |

## Playoffs (utiles en avril–juin)

Le pipeline gère déjà les séries, les numéros de match (Game 1, 2…) et l'annulation des matchs
if-necessary. Ces scripts restent pour rattraper des données anciennes.

| Commande | Rôle |
|---|---|
| `npm run db:backfill-postseason` | Play-in + playoffs complets (matchs, box scores, pronos, séries) |
| `npm run db:fix-playoff-series` | Tours, conférences, victoires et numéros de match des séries |
| `npm run db:fix-playoff-rounds` | Tour/conférence manquants (via les notes ESPN) |
| `npm run db:fix-playoff-seeds` | Seeds du 1er tour (inférence avec le Play-in) |
| `npm run db:fix-game-numbers` | Numéros de match |
| `npm run db:diagnose-bracket` | Diagnostic du bracket |

## Divers

| Commande | Rôle |
|---|---|
| `npm run db:fetch-headshots` | Photos des joueurs (la synchro effectifs les renseigne déjà) |
| `npm run db:normalize-positions` | PG/SG → G, SF/PF → F |
| `npm run db:generate-friend-codes` | Codes amis manquants |
| `npm run db:diagnose-standings` / `db:check-missing` / `db:fix-standings` | Diagnostics de classement de 2025-26 |

## ⚠️ Destructifs

| Commande | Effet |
|---|---|
| `npm run db:reset-games` | Supprime **tous** les matchs |
| `npm run db:reset-nba` | Vide **toutes** les données NBA |
| `npm run db:delete-users -- email1 email2` | Comptes : aperçu de ce qui sera perdu (pronos par saison, ligues). Supprime seulement avec `--confirm` |

## Fichiers obsolètes

- `prisma/archive/` : anciens scripts, conservés pour l'historique, non maintenus.
- `npm run db:fix-player-teams`, `db:seed-boxscores`, `db:seed-boxscores-regular` : corrections
  ponctuelles de 2025-26, remplacées par `db:update-rosters` et `db:run-update`.
