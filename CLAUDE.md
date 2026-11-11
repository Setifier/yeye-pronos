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
- **Hébergement** : Vercel Hobby (projet `yeye-pronos`, https://yeye-pronos.vercel.app, fonctions à Londres `lhr1`)
  → chaque CRON une fois par jour max (100 par projet, déclenchement à ±59 min dans l'heure), 60 s max par exécution.

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
  Page « Classement général » = saison en cours seulement (badge « Saison 2026-2027 »), 5 onglets (Points,
  Réussite, Bons écarts, Meilleur marqueur, Combo ultime : `src/lib/ranking-boards.ts`).
- Saisons passées : menu → Saisons passées → `/archives/[saison]`, navigation en haut (classement général, mes
  pronos, classement NBA, leaders, NBA Cup, playoffs) = les pages de la saison en cours avec `useViewedSeason()`
  (`src/components/archives/season-context.tsx`) : une page qui doit y marcher passe `?season=` à son API.
- Deux sortes de paris : les paris de match et 6 paris de début de saison (classement, bracket, NBA Cup, MVP,
  DPOY, Rookie). Les paris des playoffs (`/pronos/postseason`) sont mis de côté : futurs événements créés depuis l'admin.
- Paris de début de saison : fermeture au **coup d'envoi du 1er match de saison régulière** (règle officielle).
  `PRESEASON_DEADLINES` = exceptions ponctuelles seulement (2026-27 : dim. 15 nov. 23h59, lancement bêta — ne pas reconduire).
- Barèmes : `src/types/special-predictions.ts` (principe : plus c'est dur, plus ça rapporte ; rien n'est payé deux fois).
  Cotes MVP / DPOY / Rookie : `src/lib/award-odds.ts`, classements `AWARD_RANKINGS` à saisir chaque saison.
  Barème complet affiché sur une seule page (`/pronos/regles`) ; ailleurs, un chiffre par choix.
- Notation des paris de saison : `src/lib/preseason-grading.ts` (progressive, idempotente, CRON du matin + admin).
  Trophées (MVP, DPOY, Rookie, MVP des Finales) saisis dans Admin → Paris de saison (table `SeasonAwardResult`).
- Paris d'un match : fermeture au coup d'envoi (`predictionDeadlineFor()`).
- Couleurs : `#5096ff` (action), `#ff5050` (urgence / à faire), `#dcff50` (points), fond zinc-950.

## Interface mobile (< 768 px, joueur connecté)

- Pensée « jeu mobile », même données : écrans mobiles en `md:hidden`, version ordinateur en `hidden md:block`
  (ne jamais changer l'affichage ordinateur en touchant au mobile).
- `src/components/mobile/*` (barre du haut + menu, accueil, bande des nuits, `useHud` ← `/api/me/hud`),
  onglets `src/components/layout/mobile-tab-bar.tsx` (Accueil · Matchs · « Parier » · Classement · Pronos ; ne pas
  y mettre les stats NBA), carte compacte `MobileGameCard` dans `game-bet-card.tsx` (détail des bonus d'un match terminé).
- Stats NBA sur mobile : bouton du menu → `/nba` (tout le contenu NBA). Sous-menus qui défilent : `justify-start`.

## Joueurs de l'app

- Fiche `/joueur/[id]` (`src/lib/public-profile.ts`) : Pronos, Ajouter en ami / Ami ✓, Comparer. Un toucher sur un
  joueur (classement, amis…) l'ouvre.
- Pronos des autres : `/joueur/[id]/pronos` (`src/lib/player-bets.ts`), nuit par nuit à côté des miens, bonus compris.
  **Jamais un match pas encore joué** (FINAL + traité, pronos notés).
- Pas de « compétitions » pendant la bêta (pas en place) : ne rien afficher qui en parle.
- `savePrediction` émet `yeye:prediction-saved` : les listes de matchs et les compteurs suivent partout.
- Barre du haut mobile = 4rem, comme l'ordinateur : les sous-menus collants restent en `top-16`.

## Admin (`/admin/*`, rôle ADMIN)

- Pages : `dashboard` (santé + historique), `users` (joueurs), `games` (matchs par nuit),
  `saison` (paris de saison : résultats, trophées à saisir, notation), `bugs` (signalements).
- Lecture : `src/lib/admin-data.ts` · tâches partagées CRON + boutons : `src/lib/update-jobs.ts`
  (historique `CronRun` via `src/lib/cron-runs.ts`) · actions : `src/actions/admin/*`.
- Un nouveau contrôle de cohérence va dans `getHealthOverview()` ; une nouvelle tâche dans `update-jobs.ts`.
- Invitations : bouton « Inviter » (Santé, Joueurs) → `src/actions/admin/invitations.ts`, e-mail dans
  `src/lib/emails/invitation-email.ts` (aperçu `/api/admin/invitation-preview`).
- E-mails (Gmail SMTP, souvent en spam au 1er envoi) : pas d'emoji dans l'objet, pas de texte caché, toujours
  une version texte. Écrans « e-mail envoyé » : `src/components/auth/email-sent-screen.tsx` (encadré « Rien reçu ? »).
