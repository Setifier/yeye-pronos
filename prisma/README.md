# Database Scripts — NBA Pronos

All scripts run with `tsx`. Use `npm run <script-name>` or `npx tsx prisma/<file>.ts`.

---

## Season Lifecycle

### Start of season (October)

```bash
# 1. Load all games for the new season (regular season dates only)
npm run db:seed-espn -- --from=YYYY-10-21 --to=YYYY+1-04-15

# 2. Update player rosters (new players, trades, retirements)
npm run db:seed-players

# 3. Fetch player headshots from ESPN CDN
npm run db:fetch-headshots
```

### Postseason (Play-In + Playoffs)

```bash
# Load Play-In + Playoff games (extend through Finals ~June 22)
npm run db:seed-espn -- --from=YYYY-04-15 --to=YYYY-06-22

# Fetch boxscores for already-finished postseason games
npm run db:seed-boxscores
```

### Catch-up / Recovery (missing scores or boxscores)

```bash
# Full regular-season recovery: missing scores → boxscores → predictions → standings
npm run db:seed-boxscores-regular

# Optionally, recalculate standings only (fast)
npm run db:recalculate-standings

# Recalculate all player season averages from scratch
npm run db:recalculate-player-stats
```

---

## Script Reference

| Script | File | When to use |
|--------|------|-------------|
| `db:seed` | `seed.ts` | Initial DB setup (teams, conferences, divisions) |
| `db:seed-players` | `seed-players.ts` | Load/update full player rosters — run at start of each season |
| `db:seed-espn` | `seed-espn.ts` | Bulk-load games for a date range from ESPN |
| `db:seed-boxscores` | `seed-boxscores.ts` | Fetch boxscores for **postseason** (Play-In + Playoffs) FINAL games missing stats |
| `db:seed-boxscores-regular` | `seed-boxscores-regular.ts` | Full catch-up for regular season: missing scores + boxscores + predictions + standings |
| `db:recalculate-standings` | `recalculate-standings.ts` | Recompute team standings from game results (regular season only) |
| `db:recalculate-player-stats` | `calculate-all-player-stats.ts` | Recompute season averages for all players from GamePlayerStats |
| `db:fetch-headshots` | `fetch-player-headshots.ts` | Pull player headshot URLs from ESPN CDN |
| `db:reset-games` | `reset-games.ts` | ⚠️ Delete all games (use before re-seeding) |
| `db:reset-nba` | `reset-nba-data.ts` | ⚠️ Delete all NBA data: teams, players, games, stats |

### Admin utilities (no npm script — run directly)

```bash
npx tsx prisma/generate-friend-codes.ts   # Backfill friendCodes for existing users
npx tsx prisma/delete-all-notifications.ts # Purge all notifications
```

---

## CRON Job

**One daily cron** runs automatically on Vercel at **06:00 UTC (08:00 Paris)**:

```
POST /api/cron/morning-update
```

### What it does (in order)

1. **Scores** — Find SCHEDULED/LIVE games whose date has passed → fetch ESPN → update to FINAL
2. **Boxscores** — For newly FINAL games: fetch full boxscore, save `GamePlayerStats`
3. **Predictions** — Calculate WON/LOST + bonus points for all pending predictions
4. **Player stats** — Recalculate season averages for players involved
5. **Standings** — Recalculate team standings for teams that played (regular season only)
6. **Injuries** — Sync latest injury report from ESPN
7. **Trades** — Sync last 3 days of transactions from ESPN

### Other cron routes (available for manual testing)

| Route | Purpose |
|-------|---------|
| `/api/cron/update-injuries` | Injury sync only |
| `/api/cron/sync-trades` | Transactions sync only |
| `/api/cron/update-live-scores` | Score update only (manual trigger) |
| `/api/cron/daily-digest` | Weekly email digest (not in vercel.json) |

All routes require `Authorization: Bearer <CRON_SECRET>`.

---

## Season Types

ESPN classifies games by `season.type`:

| ESPN type | `seasonType` in DB | Description |
|-----------|-------------------|-------------|
| `2` | `Regular Season` | Regular season (includes NBA Cup) |
| `5` | `Play-In Tournament` | Play-In Tournament |
| `3` | `Playoffs` | NBA Playoffs |

**Important rules:**
- **Standings** (`TeamSeasonStats`) → regular season only
- **Player averages** (`PlayerSeasonStats`) → regular season only
- **Raw game stats** (`GamePlayerStats`) → all season types (full history preserved)

---

## Archive

Old diagnostic and one-time fix scripts are kept in `prisma/archive/` for reference.
They are not registered in `package.json` and should not be run unless specifically needed.
