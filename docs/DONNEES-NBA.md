# Données NBA — sources, règles et pièges

> Dernière vérification des APIs : **23 octobre 2026** (saison 2026-27).

Toutes les données NBA viennent de l'**API publique ESPN** (gratuite, sans clé).
Les routes API de l'application ne font **jamais** d'appel externe : elles lisent la base,
remplie par le CRON et les scripts.

## Endpoints utilisés

Base : `https://site.api.espn.com/apis/site/v2/sports/basketball/nba`

| Donnée | Endpoint | Utilisé par | État |
|---|---|---|---|
| Calendrier, scores, statuts | `/scoreboard?dates=YYYYMMDD` | `game-sync.ts` | ✅ |
| Box score d'un match | `/summary?event={id}` | `espn-stats.ts` | ✅ |
| Liste des 30 équipes | `/teams?limit=40` | `roster-sync.ts` | ✅ |
| Effectif d'une équipe | `/teams/{espnTeamId}/roster` | `roster-sync.ts` | ✅ |
| Infirmerie | `/injuries` | `roster-sync.ts` | ✅ |
| Classement officiel | `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings` | `verify-season.ts` (contrôle) | ✅ |
| Transactions | `/transactions?dates=A-B` | plus utilisé | ⚠️ textes trop fragiles |

## Ce qu'on récupère et où c'est calculé

| Donnée | Source | Calcul | Stockage |
|---|---|---|---|
| Matchs (date UTC, statut, score, période) | scoreboard | `src/lib/game-sync.ts` | `Game` |
| Stats joueur par match | summary | `src/lib/espn-stats.ts` | `GamePlayerStats` |
| Moyennes saison joueurs | nos box scores | `src/lib/calculate-player-season-stats.ts` | `PlayerSeasonStats` |
| Classement équipes (V-D, dom/ext, conf, div, 10 derniers, série) | nos matchs FINAL | `src/lib/standings-calculator.ts` | `TeamSeasonStats` |
| Rang + départages | `TeamSeasonStats` | `src/app/api/standings/route.ts` | calcul à la volée |
| Effectifs, transferts, agents libres | 30 rosters | `src/lib/roster-sync.ts` | `Player.teamId` |
| Blessures | `/injuries` + rosters | `src/lib/roster-sync.ts` | `Player.isInjured…`, `InjuryReport` |
| NBA Cup (tour) | notes du scoreboard | `src/lib/game-sync.ts` | `Game.nbaCupRound` |
| NBA Cup (groupe) | inférence sur les matchs de poule | `prisma/backfill-nba-cup.ts` | `Game.nbaCupGroup` |
| Séries playoffs | scoreboard (notes de tour) | `src/lib/playoff-series.ts` | `PlayoffSeries` |

## Règles d'import (calendrier)

- **Types ESPN** : `1` présaison, `2` saison régulière, `3` playoffs, `5` play-in.
  On n'importe que 2, 3 et 5. ⚠️ Avant 2026-27, la présaison était importée comme
  « Regular Season » (elle aurait faussé le classement).
- **Saison** : ESPN donne l'année de **fin** (`2027` → `"2026-27"`).
- **Dates** :
  - `Game.gameDate` = instant exact UTC.
  - `Game.localGameDate` = heure locale de l'équipe à domicile, stockée en « faux UTC ».
  - Le regroupement par jour suit la **date US Eastern** (convention NBA) : un match du
    23 octobre à 22h ET se joue le 24 à 4h à Paris, mais il est affiché le 23.
  - L'affichage se fait en heure de Paris (`Europe/Paris`), changements d'heure gérés par `Intl`.
- **Limite des pronos** : au **coup d'envoi** (`PREDICTION_DEADLINE_MINUTES = 0`, `predictionDeadlineFor()`
  dans `src/types/bet.ts`). L'app la recalcule toujours depuis `gameDate` : si ESPN décale l'horaire,
  la limite suit immédiatement. `Game.predictionDeadline` est tenu aligné par la synchro.
- **Matchs « TBD »** (NBA Cup à élimination directe, playoffs) : ignorés tant qu'ESPN ne
  connaît pas les équipes, puis créés automatiquement par le CRON (fenêtre J-3 → J+7).
- **Matchs ajoutés en cours de saison** : chaque équipe a 80 matchs au calendrier initial ;
  les 2 derniers sont fixés après la phase de groupes de la NBA Cup (début décembre). Le CRON
  les crée automatiquement.
- **Protections** : un match `FINAL` ne repasse jamais en `SCHEDULED`/`LIVE` ; un match
  if-necessary annulé par nous reste `CANCELLED` ; un report (`POSTPONED`) annule les pronos en attente ;
  les équipes d'un match ne sont modifiées que si personne n'a encore parié dessus.
- **Statut en direct** : basé sur `status.type.state` (`pre`/`in`/`post`) — le nom seul
  (`STATUS_HALFTIME`, `STATUS_END_PERIOD`) faisait repasser les matchs en « programmé » à la mi-temps.

## Règles de calcul

- **Classement et moyennes joueurs** : saison régulière uniquement. La **finale de la NBA Cup ne
  compte pas** (règle NBA) ; quarts et demies comptent.
- **Match traité** = `FINAL` avec `scoreMarginCategory` renseigné. C'est le marqueur
  d'idempotence du pipeline : relancer le CRON ou `db:run-update` ne recalcule rien deux fois.
- **Box score pas encore disponible** : on retente pendant 36 h avant de calculer les pronos
  sans meilleur marqueur.
- **Cote du meilleur marqueur** (`src/lib/player-odds.ts`) : `40 − moyenne de référence`.
  En début de saison, la moyenne de référence mélange la saison en cours et la précédente
  tant que le joueur a moins de 10 matchs. Sans ça, tout le monde (stars comprises) avait la
  cote maximale de 40 pts en octobre.

## Pièges ESPN connus

| Piège | Solution |
|---|---|
| 6 abréviations différentes de la NBA : `UTAH GS SA NY NO WSH` | `normalizeEspnAbbr()` dans `src/lib/espn.ts` (seule copie) |
| Les IDs d'équipes ne sont pas fiables entre APIs | Toujours associer par **abréviation** |
| `dates=A-B` (plage) renvoie 400 sur le scoreboard | Requêter jour par jour |
| `/injuries` n'a pas d'`athlete.id` | ID extrait de `athlete.links[].href` (`/id/123/`) |
| Les textes de transactions sont irréguliers (« Waived G X and G Y. », « Re-signed… ») | On compare directement les 30 rosters |
| Matchs internationaux sur terrain neutre (Mexico, Paris, Manchester) | `neutralSite: true` ; l'heure UTC reste juste, l'heure « locale » est celle de l'équipe à domicile |
| Équipes hors NBA en présaison (ex. `LON`) | Ignorées (type 1 + équipe inconnue) |
| ESPN ne donne pas le nom des groupes NBA Cup | Inférence par composantes connexes ; lettres A/B/C attribuées par ordre alphabétique (peuvent différer des lettres officielles) |

## Chiffres de référence 2026-27 (relevés le 23/10/2026)

- 30 équipes, 15 par conférence, 6 divisions de 5.
- 517 joueurs dans les rosters ESPN, 14 à 18 par équipe.
- 1 200 matchs de saison régulière programmés (80 par équipe) + 6 matchs NBA Cup « TBD ».
- 60 matchs de poule NBA Cup (4 par équipe).
- 72 joueurs à l'infirmerie.

Le script `npm run db:verify-season` contrôle tous ces points automatiquement.
