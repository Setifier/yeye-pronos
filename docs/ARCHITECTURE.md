# Architecture

## Vue d'ensemble

```
┌───────────────────────────────┐
│  ESPN (API publique, sans clé) │  scoreboard · summary · teams · roster · injuries
└───────────────┬───────────────┘
                │
   src/lib/game-sync.ts        calendrier, scores, statuts, séries, NBA Cup
   src/lib/game-processing.ts  box scores, pronos, moyennes, classement
   src/lib/roster-sync.ts      effectifs, transferts, blessures
                │
     ┌──────────┴───────────┐
     │                      │
 CRON Vercel           Scripts manuels (prisma/*.ts, lancés à la main)
 morning-update        db:run-update, db:seed-espn, db:verify-season…
 (1×/jour, 09h Paris)
     │                      │
     └──────────┬───────────┘
                ▼
┌───────────────────────────────┐
│ PostgreSQL (Neon) + Prisma 6  │
└───────────────┬───────────────┘
                │  routes /api/* : lecture seule, aucun appel externe
                ▼
┌───────────────────────────────┐
│ Next.js 15 (App Router)       │  pages, server components, Better Auth
└───────────────────────────────┘
```

Détails des sources et des règles d'import : [DONNEES-NBA.md](./DONNEES-NBA.md).

## Saisons et fuseaux horaires

- Saison courante : `getCurrentSeason()` (`src/types/season.ts`), format `"2026-27"`,
  bascule le 1er octobre. Aucune saison codée en dur dans l'app (sauf `FIRST_APP_SEASON`,
  début des archives).
- `Game.gameDate` = UTC exact ; jour d'un match = date **US Eastern** ; affichage en **heure de Paris**.
- Limite des pronos match : au coup d'envoi (`predictionDeadlineFor()` dans `src/types/bet.ts`).

## Modèle de données (19 modèles)

| Domaine | Modèles |
|---|---|
| Auth (Better Auth) | `User`, `Session`, `Account`, `Verification` |
| NBA | `Team` (30), `Player`, `Game`, `GamePlayerStats`, `PlayerSeasonStats`, `TeamSeasonStats`, `InjuryReport`, `PlayoffSeries` |
| Pronos | `Prediction` (match par match), `SpecialPrediction` (paris de saison : NBA Cup, MVP, classement, bracket, play-in, tours de playoffs), `SpecialPredictionConfig` (cotes par saison) |
| Compétition / social | `CompetitionSeason`, `PrivateLeague`, `LeagueMember`, `FriendRequest` |

Champs notables de `Game` :
- `seasonType` : `"Regular Season"` · `"Play-In Tournament"` · `"Playoffs"`
- `nbaCupRound` : `GroupPlay` · `Quarterfinal` · `Semifinal` · `Championship` ; `nbaCupGroup` : `East-A` … `West-C`
- `seriesId`, `gameNumber`, `isIfNecessary` : playoffs
- `scoreMarginCategory` : renseigné quand le match a été traité (marqueur d'idempotence)

`Team.externalId` vient historiquement de BallDontLie : **ne jamais** l'utiliser pour
associer une équipe ESPN — toujours passer par l'abréviation.

## Barème des pronos match (`src/types/bonus.ts`)

| Élément | Points | Condition |
|---|---|---|
| Bonne équipe | 10 | Vainqueur trouvé |
| Bon écart | 10 | Bonne équipe + bonne catégorie : prolongation · 1-5 · 6-10 · 11-15 · 16-20 · 21+ |
| Meilleur marqueur | 40 − moyenne de référence (arrondi, 0 à 40) | Indépendant du vainqueur |
| Combo | 20 | Les trois justes |

Maximum : 80 pts. La moyenne de référence est expliquée dans [DONNEES-NBA.md](./DONNEES-NBA.md#règles-de-calcul).

## Paris de saison (`src/types/special-predictions.ts`)

Présaison : champion NBA Cup, MVP, classement des 30 équipes, bracket Play-in + Playoffs.
Postseason : Play-in, 1er tour, 2e tour, finales de conférence, Finale NBA.

**Début de saison** (en place depuis le 01/11/2026) :

| Élément | Fichier |
|---|---|
| Date limite : **coup d'envoi du 1er match de saison régulière** ; exceptions ponctuelles dans `PRESEASON_DEADLINES` (2026-27 : mar. 10 nov. 23h59, lancement bêta) | `src/types/special-predictions.ts` |
| Cotes NBA Cup (rang de la saison précédente, ou `SpecialPredictionConfig`), validation, classement par défaut | `src/lib/special-bets.ts` |
| Logique du bracket (seeds = top 10 du classement prédit, play-in 7e/8e, séries 4-7 matchs, nettoyage en cascade) | `src/lib/preseason-bracket.ts` |
| API lecture / enregistrement (refus après la date limite) | `GET`/`PUT /api/special-predictions` |
| Pages | `/pronos/preseason` (récap 0-4/4) · `classement` · `bracket` · `nba-cup` · `mvp` |

Données stockées dans `SpecialPrediction.data` (JSON, unique par utilisateur × type × saison).
Le calcul des points n'est pas encore écrit (NBA Cup : mi-décembre ; le reste : fin de saison).
Statut d'ouverture (`/api/pronos/bet-status` et `/pronos/postseason`) : un pari de postseason
ouvre quand le tour précédent est terminé et ferme au premier match de son tour.
Affichage : uniquement « Ouvert » ou « Fermé ».

## Routes API

| Domaine | Routes |
|---|---|
| CRON | `cron/morning-update` (planifié) · `cron/update-live-scores` · `cron/refresh-daily-games` · `cron/update-injuries` · `cron/sync-trades` |
| Accueil | `home` (nuit en cours + pronos, dernière nuit, prochaine nuit, rang de la saison — un seul appel) |
| Matchs | `bets?date=` / `bets?month=` (format BetGame, utilisé par l'interface de pari) · `games/[gameId]/boxscore` · `games/[gameId]/players` (effectif + cotes top scorer) · `games`, `games/month` (ancien format, plus utilisés par l'app) |
| Pronos | `predictions` (POST : bonus conservés si non envoyés, `null` = retiré) · `pronos?statsOnly=1&season=` · `pronos/day-stats` · `pronos/bet-status` |
| NBA | `standings` · `teams` · `teams/[id]/details` · `players` · `players/search` · `players/[id]/stats` · `leaders` |
| Playoffs | `playoffs/bracket` · `playoffs/playin` · `playoffs/equipes` · `playoffs/joueurs` |
| NBA Cup | `nba-cup` · `nba-cup/equipes` · `nba-cup/joueurs` |
| Utilisateurs | `user/profile` · `users/search` · `users/[id]/public-profile` · `classement` · `competitions` · `archives` |
| Social | `friends` · `friends/requests` · `friends/requests/sent` · `friends/requests/[id]/accept` · `friends/requests/[id]/reject` · `friends/[id]/compare` |
| Dashboard | `dashboard/stats` · `dashboard/recent-predictions` · `dashboard/leaderboard` |
| Admin | `admin/games` · `admin/users` · `admin/stats` · `admin/recalculate-standings` |
| Auth | `auth/[...all]` · `clear-session` |

## Pages

| Domaine | Pages |
|---|---|
| Public | `/` · `/auth/*` (connexion, inscription, vérification, mot de passe) |
| Matchs | `/matchs` · `/matchs/[gameId]` · `/archives` |
| Pronos | `/pronos` · `/pronos/matchs` · `/pronos/regles` · `/pronos/preseason/{mvp,nba-cup,classement,bracket}` · `/pronos/postseason/{playin,playoffs-r1,playoffs-r2,playoffs-cf,playoffs-finals}` |
| NBA | `/standings` · `/leaders` · `/joueurs` · `/joueurs/[id]` · `/joueurs/infirmerie` · `/joueur/[id]` |
| Playoffs | `/playoffs` · `/playoffs/equipes` · `/playoffs/joueurs` |
| NBA Cup | `/nba-cup` · `/nba-cup/groupes` · `/nba-cup/wildcard` · `/nba-cup/equipes` · `/nba-cup/joueurs` |
| Compte | `/dashboard` · `/classement` · `/profile` · `/parametres` · `/amis` · `/comparer/[friendId]` · `/onboarding` |
| Admin | `/admin/dashboard` · `/admin/games` · `/admin/users` |

## Interface de pari

Une seule interface, partagée par l'accueil (`/dashboard`), `/matchs` et `/pronos/matchs` :

| Fichier | Rôle |
|---|---|
| `src/lib/game-night.ts` | « Nuit NBA » : nuit en cours = date US Eastern de maintenant ; libellés « Nuit du mar. 28 au mer. 29 oct. » ; heures de Paris ; comptes à rebours |
| `src/types/bet.ts` | Type `BetGame`, `isBettable()` (programmé, pas if-necessary, avant la clôture), `missingBets()` |
| `src/lib/bet-games.ts` | Chargement serveur : matchs d'une ou plusieurs nuits + prono de l'utilisateur + bilans des équipes |
| `src/components/bets/game-bet-card.tsx` | Carte de match : clic sur une équipe = prono enregistré, clôture + compte à rebours, direct, résultat et points (respecte No Spoil) |
| `src/components/bets/bet-sheet.tsx` | Fenêtre de pari guidée : vainqueur → écart → meilleur marqueur (cotes), enchaînement « match suivant » pour les paris manquants |
| `src/components/bets/use-bet-games.tsx` | État partagé : choix rapide, ouverture de la fenêtre, box score |
| `src/components/bets/hooks.ts` | `useNow`, `useNoSpoil` (préférence commune, localStorage), `savePrediction` |

Accueil : les **paris manquants** ne concernent que la nuit en cours (matchs encore ouverts sans prono).
S'il n'y a pas de match cette nuit, l'accueil affiche la prochaine nuit sans la compter comme manquante.

Navigation mobile : barre d'onglets en bas (`src/components/layout/mobile-tab-bar.tsx`) —
Accueil · Matchs · Pronos · Classement · Stats NBA. Le sous-menu Stats donne accès à la NBA Cup, aux Playoffs et à l'infirmerie.

## Classement des joueurs de l'app

`src/lib/season-ranking.ts` : par saison (défaut : saison en cours, `?season=all` pour toutes),
points = pronos match + paris de saison, ex æquo au même rang. Utilisé par `/api/classement` et `/api/home`.

## Limites connues

1. **Chaque CRON une fois par jour au plus** (Vercel Hobby) : matin (tout le pipeline) + soir (blessures) ;
   pas de scores en direct sans service externe
   (voir [SCRIPTS.md](./SCRIPTS.md#scores-en-direct-optionnel)).
2. **Durée max 60 s** par exécution : les gros rattrapages se font avec `npm run db:run-update`.
3. **Groupes NBA Cup** : lettres A/B/C inférées, pas forcément les lettres officielles.
4. **Matchs sur terrain neutre** (Paris, Mexico, Manchester) : l'heure « locale » affichée côté US
   est celle de l'équipe à domicile ; l'heure de Paris est exacte.
5. **Cote du meilleur marqueur** : calculée au moment du résultat (même formule qu'à l'affichage) ;
   elle peut bouger légèrement entre le prono et le match si la moyenne du joueur évolue.
