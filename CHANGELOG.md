# Changelog

## 2026-11-11 — Classements de la saison, saisons passées

### Classement
- Saison en cours seulement (« Saison en cours »), plus de choix de saison ni « Toutes saisons ».
- **5 classements** : Points · Réussite (10 pronos terminés minimum) · Bons écarts · Meilleur marqueur ·
  Combo ultime, chacun avec son podium. Toucher un joueur ouvre toujours sa fiche.

### Saisons passées (Archives)
- Une carte par saison terminée, avec son champion, qui ouvre ses classements (`/archives/[saison]`, mêmes
  5 onglets). La page existait déjà en lien mais menait à une page introuvable.
- Lien « Saisons passées » en bas du classement ; retiré de la page Stats NBA (ce n'est pas du contenu NBA).

## 2026-11-10 — Pronos des autres joueurs, amis, Stats NBA sur mobile

### Pronos des autres joueurs
- **Fiche d'un joueur** (`/joueur/[id]`), ouverte d'un toucher depuis le classement (podium et liste), les amis,
  la recherche ou les demandes : boutons **Pronos**, **Ajouter en ami** (→ « Demande envoyée », « Accepter sa
  demande » s'il a demandé, **Ami ✓** quand c'est fait) et « Comparer nos stats » entre amis.
- **Ses pronos nuit par nuit** (`/joueur/[id]/pronos`) : uniquement les matchs terminés, à côté des miens, avec
  l'équipe, l'écart, le meilleur marqueur, le combo et les points de chacun ; score de la nuit (« Tu gagnes la
  nuit (+14) »). No Spoil : la nuit d'hier et celle de ce soir restent masquées jusqu'au clic.
- Fiche et comparaison : stats de la **saison en cours**, rang et points identiques au classement.

### Mobile
- Matchs terminés : **détail des bonus** sur la carte (vainqueur, écart, marqueur, combo : ✓ / ✗, points, vrai
  résultat si raté). « Hier soir » de l'accueil : icônes des bonus gagnés.
- Onglets remis comme avant (Accueil · Matchs · Parier · Classement · Pronos). **Stats NBA** : gros bouton du
  menu → nouvelle page `/nba` qui regroupe tout le contenu NBA (classement, leaders, joueurs, infirmerie, NBA Cup,
  playoffs, saisons passées). Les sous-menus NBA commencent par « Tout » sur téléphone.
- Pages revues sur téléphone : Amis (une ligne par ami, onglets qui tiennent), fiche et profil, comparaison,
  derniers pronos, Infirmerie, fiche d'un joueur NBA, Paramètres, Archives. Sous-menus NBA Cup et Playoffs : le
  1er lien (« Bracket ») n'est plus coupé.

### Bêta
- Plus aucune trace des « compétitions » (pas en place) : stats du profil, comparaison, calcul côté serveur.

## 2026-11-09 — Stats NBA sur mobile, e-mails moins souvent en spam

### Mobile
- Onglet Stats NBA en bas (remplacé le 10/11 par le bouton Stats NBA du menu et la page `/nba`).
- Sous-menu des stats : le lien actif est amené au milieu de la barre qui défile.

### E-mails
- Invitation : objet sans emoji, plus de texte caché, moins de vocabulaire publicitaire, rappel « Non spam »
  en pied d'e-mail.
- E-mails automatiques (confirmation d'adresse, mot de passe oublié, alertes) : version texte ajoutée.
- Pages « e-mail envoyé » (inscription, mot de passe oublié, renvoi, lien expiré) en français, avec l'encadré
  « Rien reçu ? » (spams, onglet Promotions, « Non spam », nom de l'expéditeur) et le renvoi de l'e-mail.

## 2026-11-08 — Version mobile et invitations

### Version mobile (écrans < 768 px)
- Interface pensée comme un jeu mobile, l'affichage ordinateur ne change pas.
- **Barre du haut** : logo, rang, points ; l'avatar ouvre le menu (profil, stats NBA, NBA Cup, playoffs, amis,
  règles, paramètres, admin, signaler un bug, déconnexion). Plus de pied de page pour un joueur connecté.
- **Onglets** Accueil · Matchs · **Parier** · Classement · Pronos. Le bouton central ouvre directement les
  paris manquants de la nuit, avec le nombre à faire en pastille.
- **Accueil** : la nuit en cours avec un anneau de progression et un gros bouton « Jouer », les matchs,
  hier soir en une ligne (repliable), la course au classement (« à 45 pts de Kevin »).
- **Cartes de match compactes** : un toucher sur un logo = prono ; le centre ouvre les bonus.
- **Matchs** : bande des nuits à faire défiler + calendrier natif du téléphone.
- **Pronos** : bilan en grand (points, réussite, écarts, marqueurs, combos) et deux tuiles (paris de match,
  paris de saison).
- Formulaires Classement et Bracket des paris de saison : bouton « Enregistrer » collé en bas, sans onglets.

### Invitations (admin)
- Bouton **Inviter** dans Admin → Santé et Admin → Joueurs : une ou plusieurs adresses (20 max), un e-mail
  d'invitation par personne. Mention bêta / saison test, rappel de la date limite des paris de saison tant
  qu'ils sont ouverts. Aperçu : `/api/admin/invitation-preview`.
- Adresses déjà inscrites et domaines refusés à l'inscription (`ALLOWED_EMAIL_DOMAINS`) : pas d'envoi, signalé.

## 2026-11-01 — Préparation de la bêta

### Administration (refonte)
- **Santé** (`/admin/dashboard`) : verdict « Tout est à jour / N points à vérifier » avec le bouton qui règle
  chaque point, derniers passages des CRON du matin et du soir, nuit en cours (joueurs qui ont parié), joueurs,
  signalements, contrôles des données (ceux de `db:verify-season --quick`), historique des 15 derniers passages
  avec leur journal.
- **Actions en un clic**, mêmes tâches que les CRON (`src/lib/update-jobs.ts`) : lancer la mise à jour,
  blessures, recalculer le classement, mettre à jour une nuit, retraiter un match.
- **Joueurs** : recherche, filtres (paris de saison incomplets, pas parié ce soir, e-mail non confirmé, bannis),
  points et rang, paris de saison faits, dernière activité ; passer admin, bannir, supprimer (la suppression
  échouait si le joueur possédait une ligue).
- **Matchs** : nuit par nuit (traité ou non, box score, pronos) et matchs à rattraper sur toute la saison.
- **Signalements** : enregistrés en base, « à traiter / résolus », réponse par e-mail en un clic.
- Nouvelles tables `CronRun` (historique, 60 jours) et `BugReport` : `npx prisma db push`.
- Admin utilisable sur mobile ; liens morts (Notifications, Paramètres) et routes `/api/admin/{stats,users,games}`
  retirés.

### Paris de début de saison (nouveau)
- 6 paris : classement des 30 équipes, bracket Play-in → titre (+ MVP des Finales), champion NBA Cup,
  MVP, **Défenseur de l'année** et **Rookie de l'année** (ajoutés le 8 novembre).
- Règle : fermeture au **coup d'envoi du premier match** de la saison régulière.
  Exception ponctuelle pour le lancement de la bêta 2026-27 : **dimanche 15 novembre 23h59** (Paris),
  repoussée deux fois (3 → 10 → 15 novembre) pour les testeurs et l'ajout des deux trophées.
- **Barème revu** (8 novembre, une très bonne série ≈ 2 400 pts, ≈ 1/4 d'une saison de paris de match) :
  - Trophées : une cote par joueur, 200 pts pour le 1er du classement de référence, +50 par place,
    1 000 max (`src/lib/award-odds.ts`). MVP : vote MVP puis All-NBA, les absents placés d'après leur
    évaluation NBA ; DPOY : vote DPOY puis All-Defensive ; Rookie : ordre de la draft.
  - NBA Cup : 400 pts (meilleur bilan de la saison passée) → 1 125 pts, +25 par place.
  - Classement : 50 pts par place exacte, 10 à une place près, bonus de +100 à +1 000 dès 6 places exactes.
  - Bracket : points par équipe qui passe le tour, doublés à chaque tour (50 · 100 · 200 · 400 pour le
    champion), +50 % si bon nombre de matchs, Play-in 50 par équipe, MVP des Finales 200.
    Les seeds ne rapportent plus rien (déjà comptées par le classement).
- Affichage sobre : un chiffre par choix, une phrase par pari, barème complet sur la seule page Règles.
- Paris des playoffs (Play-in, tours) retirés de la navigation : ils deviendront des événements créés
  depuis l'admin.
- API `GET`/`PUT /api/special-predictions`, validation côté serveur, refus après la date limite.
- Bracket prérempli par le top 10 du classement, brouillon gardé sur l'appareil, choix effacés en cascade.
- Statuts « Ouvert/Fermé » réels partout ; rappel sur l'accueil tant que les paris ne sont pas tous faits.
- **Notation** (`src/lib/preseason-grading.ts`), chaque matin après les matchs et depuis l'admin :
  progressive et idempotente, les points arrivent dès qu'un résultat est connu (NBA Cup en décembre,
  classement mi-avril, bracket tour par tour, trophées à leur annonce), statut « noté » quand tout est connu.
  Détail des points affiché sur chaque pari, total sur la page Début de saison, inclus au classement.
- Cotes des trophées indépendantes des effectifs (un joueur coupé ne change plus la cote des autres).
- Admin **Paris de saison** (`/admin/saison`) : résultats automatiques (NBA Cup, classement final, Play-in,
  séries), saisie des vainqueurs MVP, DPOY, Rookie et MVP des Finales (la notation repart aussitôt),
  paris joués / notés / points donnés, bouton « Recalculer les points ».
- Nouvelle table `SeasonAwardResult` : `npx prisma db push`.

### Comptes
- Inscription : domaines acceptés élargis (iCloud, Orange, Free, SFR, Laposte, Proton…) + `ALLOWED_EMAIL_DOMAINS`.
- Les noms gardent leurs accents (« Éloïse » devenait « Loise »).
- E-mails et messages d'erreur de connexion en français ; retour à la page demandée après connexion.

### Pages légales
- `/legal/mentions`, `/legal/confidentialite`, `/legal/cgu` (les liens du footer menaient à des 404).
  Éditeur particulier non professionnel (crédit Setifier D&D), hébergeur Vercel, non-affiliation NBA/ESPN,
  sources des données, RGPD (données, prestataires, cookies strictement nécessaires, droits), jeu gratuit sans
  mise ni gain. Contenu centralisé dans `src/lib/legal.ts`, contact via `CONTACT_EMAIL`.
- Footer : « Les noms et logos des équipes appartiennent à la NBA et à ses équipes » + crédit. Inscription :
  acceptation des conditions. Bouton « GitHub » retiré (fournisseur non configuré : il renvoyait une erreur).
- Nom « NBA Pronos » remplacé par « Yeye Pronos » partout (expéditeur et objet des e-mails, onboarding, admin) :
  l'app ne doit pas utiliser la marque NBA dans son nom.

### Signaler un bug
- Bouton « Signaler un bug » dans le bandeau bêta et le footer : petite fenêtre, message envoyé par e-mail à
  `CONTACT_EMAIL` avec la page et l'appareil (« Répondre » écrit directement à la personne). Anti-robots
  (champ piège, 5 envois / 10 min par IP).
- E-mails automatiques signés « Yeye Pronos », avec « merci de ne pas répondre » et l'adresse de contact en
  pied de page.

### Interface
- Bandeau « Version bêta » en haut des pages, fermable une fois pour toutes (cookie, pas de clignotement),
  et mention bêta dans le footer. Sortie de bêta : `IS_BETA = false` dans `src/lib/beta.ts`.

### Production
- Fonctions Vercel à Londres (`lhr1`), comme la base Neon : sans ça, ~80 ms par requête SQL et une nuit
  de 15 matchs ne tenait pas dans les 60 s du CRON.
- CRON du matin : e-mail aux admins seulement si un passage reste incomplet (`ok` / `problems` dans la réponse).
  Son log indique aussi les jours sans match à traiter, et le nombre de moyennes joueurs recalculées par match.
- 2e CRON le soir (`/api/cron/update-injuries`, 22h-23h Paris) : blessures et effectifs rafraîchis avant
  les matchs. Gratuit : Vercel Hobby autorise jusqu'à 100 CRON, chacun une fois par jour.
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
