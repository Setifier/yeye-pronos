# Installation et configuration

## Prérequis

- Node.js 20+ (le projet tourne sous WSL Ubuntu)
- PostgreSQL (Neon en production)
- Les APIs ESPN sont gratuites et sans clé

## Variables d'environnement

Copier `.env.example` en `.env` :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret de session (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL de l'app (`http://localhost:3000` en local) |
| `NEXT_PUBLIC_API_URL` | URL publique de l'app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Connexion Google |
| `NODEMAILER_USER` / `NODEMAILER_APP_PASSWORD` | Emails (Gmail SMTP) |
| `CRON_SECRET` | Protège les routes `/api/cron/*` (`openssl rand -hex 32`) |
| `ADMIN_EMAILS` | Emails administrateurs, séparés par `;` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Avatars |

## Base de données

```bash
npx prisma generate
npx prisma db push
```

Le client Prisma est généré dans `src/generated/prisma`.

## Données NBA

Les 30 équipes doivent exister en base (elles sont conservées d'une saison à l'autre).
Ensuite, suivre la checklist de [NOUVELLE-SAISON.md](./NOUVELLE-SAISON.md) :

```bash
npm run db:update-rosters
npm run db:seed-espn
npm run db:run-update -- --days=10
npm run db:backfill-nba-cup -- --skip-scan
npm run db:verify-season
```

## Lancer l'app

```bash
npm run dev
```

## Production (Vercel)

1. Variables d'environnement renseignées (dont `CRON_SECRET`).
2. `vercel.json` déclare deux CRON (Vercel ne suit pas les changements d'heure) :
   `/api/cron/morning-update` à `0 8 * * *` (09h00 Paris en hiver, 10h00 en été) et
   `/api/cron/update-injuries` à `0 21 * * *` (blessures avant les matchs, 22h-23h Paris en hiver).
3. Après déploiement : onglet **Cron** du dashboard Vercel → vérifier que les jobs sont actifs,
   puis consulter ses logs le lendemain matin.
4. Contrôle de cohérence à tout moment : `npm run db:verify-season`.

## Dépannage

| Symptôme | Cause probable | Correction |
|---|---|---|
| Aucun match affiché | Calendrier de la saison pas importé | `npm run db:seed-espn` |
| Scores pas à jour | CRON pas passé / matchs non traités | `npm run db:run-update` |
| Joueur dans la mauvaise équipe | Transfert récent | `npm run db:update-rosters` |
| Classement différent d'ESPN | Matchs non traités | `npm run db:run-update` puis `npm run db:verify-season` |
| Heure d'un match fausse | Horaire modifié par la NBA | `npm run db:seed-espn -- --from=AAAA-MM-JJ --to=AAAA-MM-JJ` |
| `401 Unauthorized` sur un CRON | Header manquant | `Authorization: Bearer $CRON_SECRET` |
