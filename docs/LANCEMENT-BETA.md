# Lancement de la bêta (2-3 testeurs)

Objectif : vérifier en conditions réelles l'inscription, les paris, le CRON, les points et le classement.
Hors périmètre de la bêta : trophées/défis, archives des saisons passées, scores en direct.

## 1. Avant de déployer

| # | Étape | Comment |
|---|---|---|
| 0 | Comptes de test (optionnel) | `npm run db:delete-users -- email1 email2` (aperçu), puis `--confirm`. Supprime aussi les pronos des saisons passées de ces comptes |
| 1 | Données de la saison à jour | `npm run db:run-update -- --days=3` puis `npm run db:verify-season` → « Tout est cohérent » |
| 2 | Configuration | `npm run check:setup` avec le `.env` de production (`vercel env pull .env.production.local`) |
| 3 | Variables Vercel | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (= URL de prod, sans `/` final), `NEXT_PUBLIC_API_URL` (même valeur, ou absente — jamais `localhost`), `CRON_SECRET`, `NODEMAILER_USER`, `NODEMAILER_APP_PASSWORD`, `ADMIN_EMAILS`, `CONTACT_EMAIL` (affichée sur les pages légales), Google + Cloudinary si utilisés. Modèle : `env.example`. À régler **avant** le push (les `NEXT_PUBLIC_*` sont figées au build) |
| 4 | Google OAuth | Console Google → identifiants → URI de redirection : `https://<domaine>/api/auth/callback/google` |
| 5 | Types | `npx tsc --noEmit` sans erreur, puis `npm run build` |
| 6 | Base de données | `npx prisma db push` après tout changement de `schema.prisma` (ex. tables de l'admin `CronRun`, `BugReport`, `SeasonAwardResult`) |

### Première fois : créer le projet Vercel

1. Pousser le code sur GitHub (`git push origin main`).
2. vercel.com → *Continue with GitHub* → **Add New… → Project** → importer le dépôt
   (absent de la liste : *Adjust GitHub App Permissions*).
3. Écran de configuration : le **nom du projet** donne l'URL (`<nom>.vercel.app`). Framework Next.js,
   commande de build par défaut (`npm run build` lance `prisma generate`).
4. *Environment Variables* : coller tout le `.env` dans le premier champ *Key* (Vercel découpe),
   **supprimer les lignes en `localhost`**, ajouter `CRON_SECRET` s'il manque (`openssl rand -hex 32`). **Deploy**.
5. Une fois en ligne : ajouter `BETTER_AUTH_URL` et `NEXT_PUBLIC_API_URL` = l'URL de prod
   (Settings → Domains), puis **Deployments → ⋯ → Redeploy** (les variables sont lues au déploiement).
6. Connexion Google : ajouter `https://<url>/api/auth/callback/google` dans la console Google.

Ensuite, chaque `git push` sur `main` redéploie automatiquement.

## 2. Après le déploiement

- Vercel → Settings → Functions : région **London (lhr1)**, la même que la base Neon (eu-west-2).
  Sinon chaque requête traverse l'Atlantique et le CRON ne tient pas dans ses 60 s une nuit de 15 matchs.
- Vercel → onglet **Cron** : `morning-update` actif (`0 8 * * *` = 09h Paris) et `update-injuries`
  (`0 21 * * *` = 22h-23h Paris, blessures avant les matchs). Bouton **Run** pour un
  premier passage : la réponse doit contenir `"ok": true` et un `durationMs` bien en dessous de 50 000.
- Créer ton compte avec l'adresse de `ADMIN_EMAILS` (rôle admin attribué à la création).
- Inviter les testeurs : **Admin → Santé → Inviter** (une adresse par ligne, 20 max). « Voir l'e-mail » montre
  l'invitation telle qu'elle part. Prévenir les testeurs : elle peut arriver dans les spams.
- Ensuite, rien à surveiller : si un passage reste incomplet (matchs non traités, ESPN en panne, effectifs
  incomplets, exécution trop lente), un e-mail « Mise à jour du matin incomplète » part vers `ADMIN_EMAILS`.
  Le passage suivant rattrape tout seul ; pour rattraper tout de suite : **Admin → Santé → Lancer la mise à jour**.
- Suivi au quotidien : **Admin → Santé** (état, historique des CRON), **Joueurs**, **Signalements**.

## 3. Ce que les testeurs doivent essayer

| Parcours | Attendu |
|---|---|
| Inscription e-mail | E-mail « Confirme ton adresse » reçu (vérifier les spams), lien → connexion → onboarding |
| Connexion Google | Arrive directement à l'onboarding |
| Onboarding | Pseudo, équipe et joueur favoris → accueil |
| Paris de début de saison | `/pronos/preseason` : classement → bracket → NBA Cup → MVP → DPOY → Rookie, avant le **dimanche 15 nov. 23h59** |
| Pari d'un match | Accueil → « Faire mes N paris » ; un clic sur une équipe enregistre ; bonus dans la fenêtre |
| Le lendemain | Points affichés sur la carte et dans « Hier soir », classement mis à jour. No Spoil actif par défaut : bouton « No Spoil » en haut (→ « Scores visibles », mémorisé sur l'appareil) ou « Afficher » sur la dernière nuit |
| Mobile | Barre du haut (rang, points, avatar → menu), onglets en bas ; le bouton central « Parier » ouvre les paris manquants de la nuit ; un toucher sur un logo enregistre le prono |

## 4. Limites connues de la bêta

- Résultats et points calculés **une fois par jour** (CRON de 09h). Pour du direct : voir [SCRIPTS.md](./SCRIPTS.md#scores-en-direct-optionnel).
- Paris de début de saison : points attribués à la fin de la NBA Cup (mi-décembre) et en fin de saison
  (script de calcul à écrire avant ces dates).
- Pas encore de notifications ni de rappels par e-mail.

## 5. En cas de souci

| Symptôme | Piste |
|---|---|
| Pas d'e-mail de confirmation | `npm run check:setup` (section SMTP) ; mot de passe d'application Gmail valide |
| « Les adresses @… ne sont pas acceptées » | Ajouter le domaine dans `ALLOWED_EMAIL_DOMAINS` (Vercel) |
| Erreur après connexion Google | URI de redirection Google ≠ `BETTER_AUTH_URL` |
| Points non attribués le matin | Logs du CRON ; rattrapage `npm run db:run-update` |
| Classement incohérent | `npm run db:verify-season` |
