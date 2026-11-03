# Contexte projet — nba-pronos

## Environnement de travail

**L'utilisateur travaille exclusivement sous WSL (Windows Subsystem for Linux).**

- Les chemins sont en format Linux : `/home/slim/Projets/Next/nba-pronos/...`
- Les outils Read/Edit/Write fonctionnent sur ces chemins WSL
- Le dev server Next.js tourne dans WSL (`npm run dev`)
- Les modifications via Edit/Write sont prises en compte par le dev server
- Une écriture peut échouer avec `EPERM … rename … .tmp` : simple verrou passager, réessayer
  (éviter les écritures parallèles sur des fichiers).
- **C'est l'utilisateur qui lance toutes les commandes** (npm, npx, tsx, prisma) : donner la commande, ne pas l'exécuter.

## Stack technique

- **Framework** : Next.js 15 App Router (Turbopack en dev)
- **ORM** : Prisma 6 + PostgreSQL (Neon), client généré dans `src/generated/prisma`
- **Auth** : better-auth
- **UI** : TailwindCSS 4 + Radix UI + lucide-react
- **Scripts** : tsx (dans `/prisma/`)
- **Saison courante** : calculée par `getCurrentSeason()` (`src/types/season.ts`) — 2026-27 depuis le 1er oct. 2026.
  Ne jamais coder une saison en dur.
- **Hébergement** : Vercel Hobby → un seul CRON par jour, 60 s max par exécution.

## Documentation

`docs/ARCHITECTURE.md` · `docs/DONNEES-NBA.md` · `docs/SCRIPTS.md` · `docs/NOUVELLE-SAISON.md` · `docs/INSTALLATION.md` · `docs/LANCEMENT-BETA.md`

## Pipeline de données (source unique, partagée CRON + scripts)

| Fichier | Rôle |
|---|---|
| `src/lib/espn.ts` | Client ESPN, `normalizeEspnAbbr()`, dates US Eastern, détection NBA Cup |
| `src/lib/game-sync.ts` | Calendrier → `Game` (présaison ignorée, TBD ignorés, séries, numéros de match) |
| `src/lib/game-processing.ts` | Matchs FINAL non traités → box score, pronos, moyennes, classement, séries |
| `src/lib/roster-sync.ts` | 30 rosters + `/injuries` → équipes, transferts, agents libres, blessures |
| `src/lib/player-odds.ts` | Moyenne de référence de la cote top scorer |

Règles clés :
- Associer les équipes ESPN **par abréviation**, jamais par `Team.externalId` (IDs BallDontLie).
- Match « traité » = `FINAL` + `scoreMarginCategory` non nul (idempotence).
- Jour d'un match = date US Eastern ; affichage en heure de Paris.
- La finale NBA Cup ne compte ni au classement ni dans les moyennes.

## Scripts DB importants

```bash
npm run db:run-update            # Équivalent manuel du CRON (--days=N, --no-sync, --no-rosters)
npm run db:verify-season         # Contrôle complet DB vs ESPN (--quick sans ESPN)
npm run db:seed-espn             # Calendrier complet de la saison
npm run db:update-rosters        # Effectifs / transferts / agents libres
npm run db:update-injuries       # Infirmerie
npm run db:backfill-nba-cup      # Tours + groupes NBA Cup (--skip-scan)
npm run db:recalculate-standings # Classement uniquement
npm run db:backfill-postseason   # Rattrapage Play-In + Playoffs
npm run db:fix-playoff-seeds     # Seeds R1 (matchup-inference)
npm run db:diagnose-bracket      # Diagnostic données bracket
```

## Bracket playoffs

- Ordre R1 (top → bottom) : 1v8 · 4v5 · 3v6 · 2v7
- Demi-haute = gagnants de 1v8 + 4v5
- Demi-basse = gagnants de 3v6 + 2v7
- Ouest à gauche, Est à droite
- La meilleure seed (plus petit numéro) toujours en haut dans les cards
- Seeds normalisés dans `getPlayoffBracket()` (team1 = meilleure seed)

## Paris

- Badges de statut : uniquement « Ouvert » ou « Fermé » (jamais « En cours » / « Bientôt »).
- Statuts postseason : règle unique dans `/api/pronos/bet-status` et `/pronos/postseason`.
- Interface de pari unique : `src/components/bets/*` (carte `GameBetCard`, fenêtre `BetSheet`, état `useBetGames`).
  Données au format `BetGame` (`src/types/bet.ts`) via `/api/home` et `/api/bets`.
- « Nuit NBA » (`src/lib/game-night.ts`) : nuit en cours = date US Eastern de maintenant. Les paris manquants
  de l'accueil ne concernent que cette nuit.
- Classement des joueurs de l'app : par saison (`src/lib/season-ranking.ts`), paris de saison inclus.
- Paris de début de saison : fermeture au **coup d'envoi du 1er match de saison régulière** (règle officielle).
  `PRESEASON_DEADLINES` = exceptions ponctuelles seulement (2026-27 : 3 nov. 23h59, lancement bêta — ne pas reconduire).
- Paris d'un match : fermeture au coup d'envoi (`predictionDeadlineFor()`).
- Couleurs : `#5096ff` (action), `#ff5050` (urgence / à faire), `#dcff50` (points), fond zinc-950.
