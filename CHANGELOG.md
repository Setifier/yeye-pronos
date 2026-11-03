# Changelog

## 2026-11-01 — Préparation de la bêta

### Paris de début de saison (nouveau)
- Classement des 30 équipes, bracket Play-in → titre (+ MVP des Finales), champion NBA Cup, MVP.
- Règle : fermeture au **coup d'envoi du premier match** de la saison régulière.
  Exception ponctuelle pour le lancement de la bêta 2026-27 : **lundi 3 novembre 23h59** (Paris).
- API `GET`/`PUT /api/special-predictions`, validation côté serveur, refus après la date limite.
- Bracket prérempli par le top 10 du classement, brouillon gardé sur l'appareil, choix effacés en cascade.
- Statuts « Ouvert/Fermé » réels partout ; rappel sur l'accueil tant que les 4 paris ne sont pas faits.

### Comptes
- Inscription : domaines acceptés élargis (iCloud, Orange, Free, SFR, Laposte, Proton…) + `ALLOWED_EMAIL_DOMAINS`.
- Les noms gardent leurs accents (« Éloïse » devenait « Loise »).
- E-mails et messages d'erreur de connexion en français ; retour à la page demandée après connexion.

### Production
- Fonctions Vercel à Londres (`lhr1`), comme la base Neon : sans ça, ~80 ms par requête SQL et une nuit
  de 15 matchs ne tenait pas dans les 60 s du CRON.
- CRON du matin : e-mail aux admins seulement si un passage reste incomplet (`ok` / `problems` dans la réponse).
- Traitement d'un match ~8× moins de requêtes SQL : box score et moyennes joueurs écrits d'un bloc
  (avant : 2 requêtes par joueur, ~100 par match ; une nuit de 15 matchs prenait 59 s en local).
- « Mot de passe oublié » réparé : better-auth 1.4 a renommé `forgetPassword` en `requestPasswordReset`
  (le bouton plantait). Formulaire traduit.
- Build : 0 erreur TypeScript ni ESLint (scripts archivés exclus, 6 erreurs de types et 15 erreurs de lint
  corrigées : variables inutilisées, apostrophes non échappées).
- Pages Profil, profil public et tableau de bord admin : appelaient `localhost:3000` en prod faute de
  `NEXT_PUBLIC_APP_URL` → utilisent `BETTER_AUTH_URL` (`src/lib/app-url.ts`).
- `env.example` aligné sur le code (`NODEMAILER_APP_PASSWORD`, `BETTER_AUTH_URL`, `CRON_SECRET`, Cloudinary…).
- Dépôt : fichiers `Zone.Identifier` et dumps `debug-*.json` ignorés.
- `db:verify-season` : un match terminé pas encore mis à jour renvoie vers `db:run-update` (et non plus `db:seed-espn`).
- Groupes NBA Cup attribués automatiquement par la mise à jour quotidienne (plus d'étape manuelle en début de saison).
- `npm run db:fix-season-format` : 2 matchs 2025-26 enregistrés avec la saison « 2025 » (ancien import).

### Contrôles
- `npm run db:delete-users` : suppression de comptes avec aperçu (pronos perdus par saison, ligues possédées).
- `ADMIN_EMAILS` tolère espaces et majuscules.
- No Spoil : bilan V-D des équipes masqué sur les matchs en cours ou terminés.
- Fiche équipe : le rang en conférence (« #- ») est maintenant enregistré à chaque mise à jour
  (règle de départage unique : `src/lib/standings-ranking.ts`). `db:recalculate-standings` respecte `--season`.
- `npm run check:setup` : configuration de production (variables, SMTP, base, date limite).
- `npm run db:verify-season` : nouvelle section « Saisons en base » (séparation des saisons).
- Checklist de lancement : `docs/LANCEMENT-BETA.md`.

## 2026-10-28 — Refonte de l'interface de pari

### Accueil
- Centré sur **la nuit en cours** : « Nuit du mar. 28 au mer. 29 oct. », progression des pronos,
  **paris manquants** (uniquement les matchs de la nuit encore ouverts), prochaine clôture avec compte à rebours,
  bouton « Faire mes N paris » qui enchaîne les matchs un par un.
- Résultats de la dernière nuit (points gagnés, masqués en mode No Spoil), ma saison (points, rang, réussite),
  top 5, paris de saison avec statuts réels (la Finale NBA était affichée « Ouvert » en dur).
- Un seul appel API (`/api/home`) au lieu de 4.

### Pari
- Nouvelle carte de match (accueil, Matchs, Mes pronos) : un clic sur une équipe enregistre le prono,
  heure limite + compte à rebours (orange < 1 h, rouge < 15 min), direct, points détaillés.
- Nouvelle fenêtre de pari : vainqueur, écart (+10), meilleur marqueur avec cote, combo expliqué.
- Les bonus déjà choisis ne sont plus effacés quand on change d'équipe.
- **Les pronos ferment au coup d'envoi** (et non plus 30 min avant). Règle unique (`predictionDeadlineFor()`),
  recalculée depuis l'heure du match : s'applique tout de suite, y compris aux matchs déjà en base.
- `/matchs` s'ouvre sur la nuit en cours (et non sur la date de Paris, décalée d'un jour la nuit).
- `/pronos/matchs` : une requête par mois au lieu d'une par match.
- Nouvelle page `/pronos/regles` (barème, exemples, heures limites, dates US/Paris).

### Classement et stats
- **Classement par saison** (+ « Toutes saisons »), paris de saison inclus, ex æquo au même rang.
- Statistiques « Mes pronos » limitées à la saison en cours.
- Classement NBA : les 30 équipes toujours affichées (0-0 avant leur premier match).
- Joueurs : seuls les joueurs sous contrat sont listés.

### Navigation
- Barre d'onglets mobile (le menu était invisible sur téléphone), sous-menu Stats avec NBA Cup, Playoffs, Infirmerie.

## 2026-10-25 — Passage à la saison 2026-27

### Données NBA
- **Pipeline unique** partagé par le CRON et les scripts (`src/lib/game-sync.ts`,
  `src/lib/game-processing.ts`, `src/lib/roster-sync.ts`) — la même logique était copiée
  dans 4 routes/scripts avec des écarts.
- **Calendrier** : le CRON du matin crée désormais les nouveaux matchs (fenêtre J-3 → J+7).
  Avant, aucun match n'était créé automatiquement (matchs NBA Cup à élimination directe,
  matchs ajoutés en décembre…).
- **Présaison** ignorée à l'import (elle était enregistrée comme saison régulière).
- **Ouverture de saison** : l'import démarrait au 21 octobre et ratait la soirée d'ouverture
  (20 octobre 2026). Les bornes de saison sont maintenant calculées (1er oct. → 30 juin).
- **Mi-temps** : les matchs repassaient en « programmé » (`STATUS_HALFTIME`) — statut basé sur
  l'état ESPN `pre`/`in`/`post`.
- **Finale NBA Cup** exclue du classement et des moyennes (règle NBA).
- **Effectifs** : synchronisation par comparaison des 30 rosters ESPN (au lieu de parser les
  textes de transactions) ; taille, poids, université et pays renseignés.
- **Blessures** : union de l'endpoint `/injuries` et des rosters, note traduite
  (« Pied gauche (fracture) »), vraie date de retour (l'ancien CRON utilisait la date de la news),
  statut des joueurs rétablis remis à vide (l'ancien CRON écrivait « ACTIVE », affiché comme blessé).
- **Playoffs** : numéros de match (Game 1, 2…) attribués automatiquement.
- **NBA Cup** : fenêtre de dates calculée pour toute saison ; noms de groupes stables.
- **Nouveau script** `npm run db:verify-season` : contrôle complet DB vs ESPN.
- **CRON** déplacé à 08:00 UTC (09h00 Paris en hiver, 10h00 en été), soit ~1h45 minimum
  après la fin du dernier match de la nuit.

### Pronos
- **Cote du meilleur marqueur** : en début de saison, toutes les cotes valaient 40 pts
  (aucune moyenne). La moyenne de référence complète maintenant avec la saison précédente
  jusqu'à 10 matchs joués, à l'affichage comme au calcul des points.
- **Statuts postseason** : le 1er tour apparaissait « Ouvert » dès octobre. Règle unique
  partagée par l'accueil des pronos et `/pronos/postseason`.

### Application
- Plus aucune saison codée en dur (≈ 25 endroits) : navigation des dates, leaders, équipes,
  joueurs, infirmerie, playoffs, NBA Cup, pronos, page d'accueil.

### Documentation
- `docs/` réécrite : architecture, données NBA, scripts/CRON, installation, nouvelle saison.
