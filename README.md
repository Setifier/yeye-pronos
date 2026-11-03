# Yeye Pronos — NBA Predictions Platform

A full-stack web app where users predict NBA games and season outcomes, compete on leaderboards,
and track their performance against friends. Built with Next.js 15, TypeScript and PostgreSQL.

All NBA data (schedule, scores, box scores, rosters, injuries) comes from ESPN's public API
and is synced into the database by a daily cron job. App routes only read from the database.

## What it does

- **Game predictions**: pick the winner, the margin category and the top scorer before tip-off
  (picks stay open until tip-off).
- **Season predictions**: NBA Cup champion, MVP, full standings, Play-In + Playoffs bracket,
  then round-by-round postseason picks.
- **Stats**: standings with tiebreakers, league leaders, player and team pages, injury report,
  NBA Cup groups and knockout bracket, playoff bracket.
- **Social**: friends via unique codes, head-to-head comparison, private leagues, global leaderboard.

## Scoring (game predictions)

| Component | Points | How |
|---|---|---|
| Correct team | 10 | Pick the winner |
| Margin | 10 | Correct team + correct margin category (OT, 1-5, 6-10, 11-15, 16-20, 21+) |
| Top scorer | 0–40 | 40 minus the player's reference scoring average — riskier picks earn more. Independent of the winner pick |
| Combo | 20 | All three right |

Early in the season the reference average blends in last season's numbers until the player
has 10 games, so stars don't get the maximum odds in October.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack in dev) |
| Language | TypeScript (strict) |
| Database | PostgreSQL (Neon) + Prisma 6 |
| Auth | Better Auth (email/password, magic link, Google OAuth) |
| Styling | Tailwind CSS 4 + Radix UI |
| Data source | ESPN public API |
| Images / Email | Cloudinary / Nodemailer |
| Hosting | Vercel (one daily cron) |

## Data pipeline

```
ESPN ──► src/lib/game-sync.ts        schedule, scores, playoff series, NBA Cup rounds
     ──► src/lib/game-processing.ts  box scores, prediction grading, player averages, standings
     ──► src/lib/roster-sync.ts      30 rosters (trades, signings, free agents) + injuries
            │
            ├── Vercel cron  /api/cron/morning-update  (daily, 08:00 UTC = 9 am Paris)
            └── manual scripts  npm run db:run-update / db:seed-espn / db:verify-season …
```

`npm run db:verify-season` checks the whole season against ESPN (30 teams, roster sizes and
team assignments, schedule and tip-off times, standings, player stats, NBA Cup, injuries).

## Getting started

```bash
npm install
cp .env.example .env        # database, auth, OAuth, SMTP, Cloudinary, CRON_SECRET
npx prisma db push
npm run db:update-rosters
npm run db:seed-espn
npm run db:run-update -- --days=10
npm run dev
```

## Documentation (French)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, routes, pages, scoring
- [docs/DONNEES-NBA.md](docs/DONNEES-NBA.md) — ESPN endpoints, import rules, known pitfalls
- [docs/SCRIPTS.md](docs/SCRIPTS.md) — cron jobs and maintenance scripts
- [docs/NOUVELLE-SAISON.md](docs/NOUVELLE-SAISON.md) — new-season checklist and 2026-27 calendar
- [docs/INSTALLATION.md](docs/INSTALLATION.md) — setup and troubleshooting
- [docs/AUTHENTIFICATION.md](docs/AUTHENTIFICATION.md) — Better Auth configuration

## Acknowledgements

The auth system was initially bootstrapped from a [Better Auth tutorial by GiraffeReactor](https://www.youtube.com/@GiraffeReactor). Everything else was built from scratch.

## License

MIT
