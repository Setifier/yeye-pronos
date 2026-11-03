/**
 * Contrôle d'intégrité de la saison (DB vs ESPN)
 *
 * Vérifie :
 *   1. Équipes      : 30 équipes, 15/15 par conférence, 6 divisions de 5
 *   2. Effectifs    : 14–18 joueurs par équipe, et (ESPN) chaque joueur dans la bonne équipe
 *   3. Calendrier   : 80–82 matchs de saison régulière par équipe, pas de doublon,
 *                     pas de présaison comptée, limite des pronos = coup d'envoi, cohérence des fuseaux,
 *                     (ESPN) aucun match manquant / en trop / à la mauvaise heure
 *   4. Résultats    : pas de match passé bloqué en SCHEDULED/LIVE, matchs FINAL traités,
 *                     box scores présents
 *   5. Classement   : bilans V-D identiques au classement officiel ESPN
 *   6. Stats joueurs: matchs joués cohérents
 *   7. NBA Cup      : 60 matchs de poule, 4 par équipe, groupes attribués
 *   8. Blessures    : nombre de blessés DB vs ESPN
 *
 * Usage :
 *   npm run db:verify-season
 *   npm run db:verify-season -- --quick              (sans appels ESPN)
 *   npm run db:verify-season -- --season=2026-27
 *   npm run db:verify-season -- --from=2026-10-20 --to=2026-11-30   (fenêtre de comparaison calendrier)
 *
 * Code de sortie 1 s'il y a au moins une erreur (❌).
 */

import { prisma } from "../src/lib/prisma";
import {
  ESPN_SITE_API,
  ESPN_STANDINGS_API,
  getGamesByDate,
  normalizeEspnAbbr,
  toEasternDateString,
  toEspnDate,
  dateRangeInclusive,
  shiftDate,
} from "../src/lib/espn";
import { fetchEspnTeams } from "../src/lib/roster-sync";
import { predictionDeadlineFor } from "../src/types/bet";
import { isTrackedESPNSeasonType, getCurrentSeason, getSeasonBounds, getSeasonStartYear } from "../src/types/season";

// ─── Rapport ──────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;
const ok   = (m: string) => console.log(`  ✅ ${m}`);
const warn = (m: string) => { warnings++; console.log(`  ⚠️  ${m}`); };
const fail = (m: string) => { errors++; console.log(`  ❌ ${m}`); };
const section = (t: string) => console.log(`\n${"─".repeat(60)}\n${t}\n${"─".repeat(60)}`);
const list = (items: string[], max = 15) => {
  for (const i of items.slice(0, max)) console.log(`       · ${i}`);
  if (items.length > max) console.log(`       … et ${items.length - max} autre(s)`);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmtET    = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "America/New_York", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtParis = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

async function main() {
  const args   = process.argv.slice(2);
  const arg    = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
  const season = arg("season") ?? getCurrentSeason();
  const quick  = args.includes("--quick");
  const bounds = getSeasonBounds(season);
  const today  = toEasternDateString(new Date());
  const cmpFrom = arg("from") ?? `${getSeasonStartYear(season)}-10-15`;
  const cmpTo   = arg("to") ?? (shiftDate(today, 7) < bounds.end ? shiftDate(today, 7) : bounds.end);

  console.log("═".repeat(60));
  console.log(`🔎  CONTRÔLE DE LA SAISON ${season}${quick ? "  (sans ESPN)" : ""}`);
  console.log(`    ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris) · ${today} (US Eastern)`);
  console.log("═".repeat(60));

  // ═══════════════════════════════════════════════════════════
  // 0. SÉPARATION DES SAISONS
  // ═══════════════════════════════════════════════════════════
  section("0. Saisons en base");
  {
    const [gameRows, predRows, specialRows, teamStatRows, playerStatRows, seriesRows] = await Promise.all([
      prisma.game.groupBy({ by: ["season"], _count: { _all: true }, _min: { gameDate: true }, _max: { gameDate: true } }),
      prisma.$queryRaw<{ season: string; n: bigint }[]>`
        SELECT g.season, COUNT(*)::bigint AS n FROM predictions p JOIN games g ON g.id = p."gameId" GROUP BY g.season`,
      prisma.specialPrediction.groupBy({ by: ["season"], _count: { _all: true } }),
      prisma.teamSeasonStats.groupBy({ by: ["season"], _count: { _all: true } }),
      prisma.playerSeasonStats.groupBy({ by: ["season"], _count: { _all: true } }),
      prisma.playoffSeries.groupBy({ by: ["season"], _count: { _all: true } }),
    ]);
    const count = <T extends { season: string }>(rows: T[], get: (r: T) => number | bigint, s: string) =>
      Number(rows.find((r) => r.season === s) ? get(rows.find((r) => r.season === s)!) : 0);
    const seasons = [...new Set([
      ...gameRows.map((r) => r.season), ...specialRows.map((r) => r.season),
      ...teamStatRows.map((r) => r.season), ...playerStatRows.map((r) => r.season),
    ])].sort();

    console.log("  Saison    Matchs  Pronos  Paris saison  Classements  Stats joueurs  Séries");
    for (const s of seasons) {
      console.log(
        `  ${s.padEnd(9)} ${String(count(gameRows, (r) => r._count._all, s)).padStart(6)}  ` +
        `${String(count(predRows, (r) => r.n, s)).padStart(6)}  ${String(count(specialRows, (r) => r._count._all, s)).padStart(12)}  ` +
        `${String(count(teamStatRows, (r) => r._count._all, s)).padStart(11)}  ${String(count(playerStatRows, (r) => r._count._all, s)).padStart(13)}  ` +
        `${String(count(seriesRows, (r) => r._count._all, s)).padStart(6)}`
      );
    }

    // Matchs rangés dans la mauvaise saison (date hors des bornes 1er oct. → 30 juin)
    const misfiled: string[] = [];
    for (const r of gameRows) {
      const b = getSeasonBounds(r.season);
      const first = r._min.gameDate ? toEasternDateString(r._min.gameDate) : null;
      const last  = r._max.gameDate ? toEasternDateString(r._max.gameDate) : null;
      if ((first && first < b.start) || (last && last > b.end)) misfiled.push(`${r.season} : du ${first} au ${last}`);
    }
    misfiled.length === 0
      ? ok("Chaque match est rangé dans la bonne saison (aucun chevauchement)")
      : (fail("Matchs hors des dates de leur saison :"), list(misfiled));

    const unknownSeason = await prisma.game.count({ where: { NOT: { season: { contains: "-" } } } });
    unknownSeason === 0 ? ok("Format de saison homogène (AAAA-AA)") : fail(`${unknownSeason} match(s) avec un format de saison inattendu → npm run db:fix-season-format`);
    console.log("  ℹ️  Classement, stats et paris sont calculés saison par saison : les données 2025-26 restent consultables sans se mélanger.");
  }

  // ═══════════════════════════════════════════════════════════
  // 1. ÉQUIPES
  // ═══════════════════════════════════════════════════════════
  section("1. Équipes");
  const teams = await prisma.team.findMany({
    select: { id: true, abbreviation: true, city: true, name: true, conference: true, division: true, logoUrl: true },
    orderBy: { abbreviation: "asc" },
  });
  const teamAbbr = new Map(teams.map((t) => [t.id, t.abbreviation]));
  teams.length === 30 ? ok("30 équipes") : fail(`${teams.length} équipes (30 attendues)`);

  const east = teams.filter((t) => t.conference === "EAST").length;
  east === 15 && teams.length - east === 15 ? ok("15 Est / 15 Ouest") : fail(`${east} Est / ${teams.length - east} Ouest`);

  const divisions = new Map<string, string[]>();
  for (const t of teams) divisions.set(t.division, [...(divisions.get(t.division) ?? []), t.abbreviation]);
  const badDiv = [...divisions].filter(([, ts]) => ts.length !== 5);
  divisions.size === 6 && badDiv.length === 0
    ? ok("6 divisions de 5 équipes")
    : fail(`Divisions incohérentes : ${[...divisions].map(([d, ts]) => `${d} (${ts.length})`).join(", ")}`);

  const noLogo = teams.filter((t) => !t.logoUrl).map((t) => t.abbreviation);
  if (noLogo.length) warn(`Sans logo : ${noLogo.join(", ")}`);

  if (!quick) {
    try {
      const espnTeams = await fetchEspnTeams();
      const missing = espnTeams.filter((t) => !teams.some((d) => d.abbreviation === t.abbr)).map((t) => t.abbr);
      missing.length === 0 ? ok("Toutes les équipes ESPN sont reconnues en DB") : fail(`Équipes ESPN introuvables en DB : ${missing.join(", ")}`);
    } catch (e) { warn(`ESPN teams indisponible : ${e}`); }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. EFFECTIFS
  // ═══════════════════════════════════════════════════════════
  section("2. Effectifs");
  const players = await prisma.player.findMany({
    where:  { teamId: { not: null } },
    select: { externalId: true, fullName: true, teamId: true },
  });
  const perTeam = new Map<string, number>();
  for (const p of players) perTeam.set(p.teamId!, (perTeam.get(p.teamId!) ?? 0) + 1);
  const badSize = teams.filter((t) => { const n = perTeam.get(t.id) ?? 0; return n < 14 || n > 18; })
    .map((t) => `${t.abbreviation} : ${perTeam.get(t.id) ?? 0} joueurs`);
  badSize.length === 0
    ? ok(`${players.length} joueurs sous contrat, 14–18 par équipe`)
    : (warn(`${badSize.length} équipe(s) hors de la plage 14–18 :`), list(badSize));

  if (!quick) {
    try {
      const espnTeams = await fetchEspnTeams();
      const dbByEspnId = new Map(players.map((p) => [p.externalId, p]));
      const wrongTeam: string[] = [];
      const missingInDb: string[] = [];
      const espnIds = new Set<string>();
      for (const t of espnTeams) {
        const res = await fetch(`${ESPN_SITE_API}/teams/${t.espnId}/roster`);
        const data = (await res.json()) as { athletes?: Array<{ id: string; displayName: string }> };
        for (const a of data.athletes ?? []) {
          espnIds.add(a.id);
          const p = dbByEspnId.get(a.id);
          if (!p) missingInDb.push(`${a.displayName} (${t.abbr})`);
          else if (teamAbbr.get(p.teamId!) !== t.abbr) wrongTeam.push(`${a.displayName} : DB ${teamAbbr.get(p.teamId!)} ≠ ESPN ${t.abbr}`);
        }
        await sleep(150);
      }
      const extra = players.filter((p) => !espnIds.has(p.externalId)).map((p) => `${p.fullName} (${teamAbbr.get(p.teamId!)})`);
      wrongTeam.length === 0 ? ok("Chaque joueur est dans la même équipe qu'ESPN") : (fail(`${wrongTeam.length} joueur(s) dans la mauvaise équipe :`), list(wrongTeam));
      missingInDb.length === 0 ? ok(`Tous les joueurs ESPN (${espnIds.size}) sont en DB avec une équipe`) : (fail(`${missingInDb.length} joueur(s) ESPN absents ou sans équipe en DB :`), list(missingInDb));
      extra.length === 0 ? ok("Aucun joueur en trop") : (warn(`${extra.length} joueur(s) rattachés à une équipe mais absents des rosters ESPN :`), list(extra));
      if (wrongTeam.length || missingInDb.length || extra.length) console.log("     → Corriger avec : npm run db:update-rosters");
    } catch (e) { warn(`Rosters ESPN indisponibles : ${e}`); }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. CALENDRIER
  // ═══════════════════════════════════════════════════════════
  section("3. Calendrier");
  const games = await prisma.game.findMany({
    where:  { season },
    select: {
      id: true, externalId: true, seasonType: true, status: true, gameDate: true, localGameDate: true,
      predictionDeadline: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true,
      scoreMarginCategory: true, nbaCupRound: true, nbaCupGroup: true, isIfNecessary: true,
      _count: { select: { playerStats: true } },
    },
    orderBy: { gameDate: "asc" },
  });
  const regular = games.filter((g) => g.seasonType === "Regular Season");
  const byType = games.reduce<Record<string, number>>((a, g) => ({ ...a, [g.seasonType]: (a[g.seasonType] ?? 0) + 1 }), {});
  console.log(`  ℹ️  ${games.length} matchs en DB : ${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(" · ") || "aucun"}`);

  if (regular.length === 0) {
    fail("Aucun match de saison régulière → lancer : npm run db:seed-espn");
  } else {
    const gp = new Map<string, number>();
    for (const g of regular) {
      gp.set(g.homeTeamId, (gp.get(g.homeTeamId) ?? 0) + 1);
      gp.set(g.awayTeamId, (gp.get(g.awayTeamId) ?? 0) + 1);
    }
    const counts = teams.map((t) => ({ abbr: t.abbreviation, n: gp.get(t.id) ?? 0 }));
    const off = counts.filter((c) => c.n < 80 || c.n > 82);
    off.length === 0
      ? ok(`Saison régulière : ${regular.length} matchs, ${Math.min(...counts.map((c) => c.n))}–${Math.max(...counts.map((c) => c.n))} par équipe (80 avant décembre, 82 ensuite)`)
      : (fail(`Nombre de matchs anormal :`), list(off.map((c) => `${c.abbr} : ${c.n}`), 30));

    // Présaison importée par erreur (avant le 15 octobre)
    const earliest = `${getSeasonStartYear(season)}-10-15`;
    const preseason = regular.filter((g) => toEasternDateString(g.gameDate) < earliest);
    preseason.length === 0 ? ok("Aucun match de présaison compté en saison régulière") : fail(`${preseason.length} match(s) "Regular Season" avant le ${earliest} (présaison ?)`);

    // Doublons : même affiche, même jour ET
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const g of games) {
      const key = `${toEasternDateString(g.gameDate)}|${[g.homeTeamId, g.awayTeamId].sort().join("|")}`;
      if (seen.has(key)) dups.push(`${toEasternDateString(g.gameDate)} ${teamAbbr.get(g.awayTeamId)} @ ${teamAbbr.get(g.homeTeamId)} (${seen.get(key)} / ${g.externalId})`);
      else seen.set(key, g.externalId);
    }
    dups.length === 0 ? ok("Aucun doublon") : (fail(`${dups.length} doublon(s) :`), list(dups));

    // Deadlines
    // L'app recalcule la limite depuis gameDate ; ce contrôle vérifie juste que la base est alignée
    const badDeadline = games.filter((g) => g.predictionDeadline.getTime() !== predictionDeadlineFor(g.gameDate).getTime());
    badDeadline.length === 0
      ? ok("Limite des pronos = coup d'envoi")
      : warn(`${badDeadline.length} match(s) avec une ancienne limite en base (sans effet sur l'app) → npm run db:seed-espn pour aligner`);

    // Fuseaux : localGameDate doit être à ±1 jour de la date ET
    const badLocal = games.filter((g) => {
      const et = new Date(`${toEasternDateString(g.gameDate)}T12:00:00Z`).getTime();
      const local = new Date(`${g.localGameDate.toISOString().slice(0, 10)}T12:00:00Z`).getTime();
      return Math.abs(et - local) > 24 * 3600 * 1000;
    });
    badLocal.length === 0 ? ok("Dates locales cohérentes avec les dates US Eastern") : fail(`${badLocal.length} match(s) avec localGameDate incohérente`);

    // Aperçu horaires (contrôle visuel ET / Paris)
    const upcoming = games.filter((g) => g.gameDate > new Date() && g.status === "SCHEDULED").slice(0, 4);
    if (upcoming.length) {
      console.log("  ℹ️  Prochains matchs (US Eastern → Paris) :");
      for (const g of upcoming) {
        console.log(`       · ${teamAbbr.get(g.awayTeamId)} @ ${teamAbbr.get(g.homeTeamId)} : ${fmtET(g.gameDate)} ET → ${fmtParis(g.gameDate)} Paris · pronos jusqu'à ${fmtParis(predictionDeadlineFor(g.gameDate))}`);
      }
    }
  }

  // Comparaison avec ESPN
  if (!quick) {
    console.log(`  ℹ️  Comparaison ESPN ${cmpFrom} → ${cmpTo}…`);
    const dbByExt = new Map(games.map((g) => [g.externalId, g]));
    const missing: string[] = [];
    const timeDiff: string[] = [];
    const statusDiff: string[] = [];
    const espnExt = new Set<string>();
    let tbd = 0;
    for (const date of dateRangeInclusive(cmpFrom, cmpTo)) {
      try {
        const { events = [] } = await getGamesByDate(toEspnDate(date));
        for (const e of events) {
          if (!isTrackedESPNSeasonType(e.season.type)) continue;
          const comp = e.competitions[0];
          const home = comp.competitors.find((c) => c.homeAway === "home")!.team.abbreviation;
          const away = comp.competitors.find((c) => c.homeAway === "away")!.team.abbreviation;
          if (home === "TBD" || away === "TBD") { tbd++; continue; }
          espnExt.add(e.id);
          const g = dbByExt.get(e.id);
          if (!g) { missing.push(`${date} ${normalizeEspnAbbr(away)} @ ${normalizeEspnAbbr(home)} (${e.id})`); continue; }
          if (Math.abs(new Date(comp.date).getTime() - g.gameDate.getTime()) > 60 * 1000) {
            timeDiff.push(`${date} ${normalizeEspnAbbr(away)} @ ${normalizeEspnAbbr(home)} : DB ${fmtParis(g.gameDate)} ≠ ESPN ${fmtParis(new Date(comp.date))} (Paris)`);
          }
          if (comp.status.type.completed && g.status !== "FINAL") {
            statusDiff.push(`${date} ${normalizeEspnAbbr(away)} @ ${normalizeEspnAbbr(home)} : terminé sur ESPN, ${g.status} en DB`);
          }
        }
      } catch (e) { warn(`ESPN ${date} : ${e}`); }
      await sleep(120);
    }
    const extra = games
      .filter((g) => { const d = toEasternDateString(g.gameDate); return d >= cmpFrom && d <= cmpTo && !espnExt.has(g.externalId) && g.status !== "CANCELLED"; })
      .map((g) => `${toEasternDateString(g.gameDate)} ${teamAbbr.get(g.awayTeamId)} @ ${teamAbbr.get(g.homeTeamId)} (${g.externalId}, ${g.status})`);

    missing.length === 0 ? ok(`Aucun match ESPN manquant${tbd ? ` (${tbd} match(s) NBA Cup encore TBD, normal)` : ""}`) : (fail(`${missing.length} match(s) ESPN absents de la DB :`), list(missing));
    extra.length === 0 ? ok("Aucun match en DB absent d'ESPN") : (warn(`${extra.length} match(s) en DB introuvables sur ESPN (reportés/supprimés ?) :`), list(extra));
    timeDiff.length === 0 ? ok("Horaires identiques à ESPN") : (fail(`${timeDiff.length} horaire(s) différent(s) :`), list(timeDiff));
    statusDiff.length === 0 ? ok("Statuts à jour") : (fail(`${statusDiff.length} match(s) terminés non mis à jour :`), list(statusDiff));
    if (missing.length || timeDiff.length) console.log("     → Corriger avec : npm run db:seed-espn  puis  npm run db:run-update");
    else if (statusDiff.length) console.log("     → Mise à jour pas encore passée depuis ces matchs : npm run db:run-update (en prod, le CRON du matin le fait seul)");
  }

  // ═══════════════════════════════════════════════════════════
  // 4. RÉSULTATS
  // ═══════════════════════════════════════════════════════════
  section("4. Résultats et traitement");
  const sixHoursAgo = Date.now() - 6 * 3600 * 1000;
  const stale = games.filter((g) => (g.status === "SCHEDULED" || g.status === "LIVE") && g.gameDate.getTime() < sixHoursAgo && !g.isIfNecessary);
  stale.length === 0 ? ok("Aucun match passé bloqué en SCHEDULED/LIVE") : (fail(`${stale.length} match(s) passés non terminés en DB → npm run db:run-update :`), list(stale.map((g) => `${toEasternDateString(g.gameDate)} ${teamAbbr.get(g.awayTeamId)} @ ${teamAbbr.get(g.homeTeamId)} (${g.status})`)));

  const finals = games.filter((g) => g.status === "FINAL");
  const noScore = finals.filter((g) => g.homeScore === null || g.awayScore === null);
  noScore.length === 0 ? ok(`${finals.length} match(s) terminé(s), tous avec un score`) : fail(`${noScore.length} match(s) FINAL sans score`);

  const unprocessed = finals.filter((g) => !g.scoreMarginCategory);
  unprocessed.length === 0 ? ok("Tous les matchs terminés sont traités (pronos, stats)") : fail(`${unprocessed.length} match(s) terminés non traités → npm run db:run-update`);

  const noBox = finals.filter((g) => g.scoreMarginCategory && g._count.playerStats < 16);
  noBox.length === 0 ? ok("Box scores présents pour tous les matchs traités") : (warn(`${noBox.length} match(s) avec un box score incomplet (< 16 joueurs) :`), list(noBox.map((g) => `${toEasternDateString(g.gameDate)} ${teamAbbr.get(g.awayTeamId)} @ ${teamAbbr.get(g.homeTeamId)} (${g._count.playerStats} joueurs)`)));

  const pendingOnFinal = await prisma.prediction.count({ where: { result: "PENDING", game: { season, status: "FINAL", scoreMarginCategory: { not: null } } } });
  pendingOnFinal === 0 ? ok("Aucun prono en attente sur un match terminé") : fail(`${pendingOnFinal} prono(s) PENDING sur des matchs terminés`);

  // ═══════════════════════════════════════════════════════════
  // 5. CLASSEMENT
  // ═══════════════════════════════════════════════════════════
  section("5. Classement");
  const stats = await prisma.teamSeasonStats.findMany({ where: { season }, select: { teamId: true, wins: true, losses: true } });
  const record = new Map(stats.map((s) => [teamAbbr.get(s.teamId)!, `${s.wins}-${s.losses}`]));
  const finalsRegular = regular.filter((g) => g.status === "FINAL").length;
  if (finalsRegular > 0 && stats.length !== 30) fail(`${stats.length} équipe(s) avec un classement (30 attendues) → npm run db:recalculate-standings`);
  else if (stats.length) ok(`${stats.length} équipes classées`);

  if (!quick) {
    try {
      const res = await fetch(ESPN_STANDINGS_API);
      const data = (await res.json()) as {
        children?: Array<{ standings?: { entries?: Array<{ team: { abbreviation: string }; stats: Array<{ name: string; value: number }> }> } }>;
      };
      const diffs: string[] = [];
      for (const conf of data.children ?? []) {
        for (const e of conf.standings?.entries ?? []) {
          const abbr = normalizeEspnAbbr(e.team.abbreviation);
          const w = e.stats.find((s) => s.name === "wins")?.value ?? 0;
          const l = e.stats.find((s) => s.name === "losses")?.value ?? 0;
          const espn = `${w}-${l}`;
          const db = record.get(abbr) ?? "0-0";
          if (espn !== db) diffs.push(`${abbr} : DB ${db} ≠ ESPN ${espn}`);
        }
      }
      diffs.length === 0 ? ok("Bilans identiques au classement ESPN") : (fail(`${diffs.length} bilan(s) différent(s) d'ESPN :`), list(diffs, 30));
      if (diffs.length) console.log("     → Corriger avec : npm run db:run-update  (ou db:recalculate-standings)");
    } catch (e) { warn(`Classement ESPN indisponible : ${e}`); }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. STATS JOUEURS
  // ═══════════════════════════════════════════════════════════
  section("6. Stats joueurs");
  const pss = await prisma.playerSeasonStats.findMany({
    where:  { season },
    select: { gamesPlayed: true, pointsPerGame: true, player: { select: { fullName: true, teamId: true } } },
  });
  const teamGamesPlayed = new Map<string, number>();
  for (const g of regular.filter((x) => x.status === "FINAL" && x.nbaCupRound !== "Championship")) {
    teamGamesPlayed.set(g.homeTeamId, (teamGamesPlayed.get(g.homeTeamId) ?? 0) + 1);
    teamGamesPlayed.set(g.awayTeamId, (teamGamesPlayed.get(g.awayTeamId) ?? 0) + 1);
  }
  const maxGames = Math.max(0, ...teamGamesPlayed.values());
  const tooMany = pss.filter((s) => s.gamesPlayed > maxGames + 1).map((s) => `${s.player.fullName} : ${s.gamesPlayed} matchs`);
  const absurd  = pss.filter((s) => s.pointsPerGame > 60).map((s) => `${s.player.fullName} : ${s.pointsPerGame.toFixed(1)} pts`);
  console.log(`  ℹ️  ${pss.length} joueur(s) avec des moyennes ${season}`);
  tooMany.length === 0 ? ok("Nombre de matchs joués cohérent") : (fail("Joueurs avec plus de matchs que leur équipe :"), list(tooMany));
  absurd.length === 0 ? ok("Moyennes plausibles") : (fail("Moyennes aberrantes :"), list(absurd));
  if (finalsRegular > 0 && pss.length === 0) fail("Matchs terminés mais aucune moyenne joueur → npm run db:recalculate-player-stats");

  // ═══════════════════════════════════════════════════════════
  // 7. NBA CUP
  // ═══════════════════════════════════════════════════════════
  section("7. NBA Cup");
  const group = games.filter((g) => g.nbaCupRound === "GroupPlay");
  const ko    = games.filter((g) => g.nbaCupRound && g.nbaCupRound !== "GroupPlay");
  group.length === 60 ? ok("60 matchs de poule") : warn(`${group.length} match(s) de poule (60 attendus) → npm run db:backfill-nba-cup`);
  const cupPerTeam = new Map<string, number>();
  for (const g of group) {
    cupPerTeam.set(g.homeTeamId, (cupPerTeam.get(g.homeTeamId) ?? 0) + 1);
    cupPerTeam.set(g.awayTeamId, (cupPerTeam.get(g.awayTeamId) ?? 0) + 1);
  }
  const badCup = teams.filter((t) => (cupPerTeam.get(t.id) ?? 0) !== 4).map((t) => `${t.abbreviation} : ${cupPerTeam.get(t.id) ?? 0}`);
  if (group.length) badCup.length === 0 ? ok("4 matchs de poule par équipe") : (warn("Matchs de poule par équipe ≠ 4 :"), list(badCup, 30));
  const noGroup = group.filter((g) => !g.nbaCupGroup).length;
  if (group.length) noGroup === 0 ? ok("Groupes attribués") : warn(`${noGroup} match(s) de poule sans groupe → npm run db:backfill-nba-cup`);
  console.log(`  ℹ️  Phase finale en DB : ${ko.length} match(s) (les affiches TBD sont créées dès qu'ESPN les connaît)`);

  // ═══════════════════════════════════════════════════════════
  // 8. BLESSURES
  // ═══════════════════════════════════════════════════════════
  section("8. Blessures");
  const injuredDb = await prisma.player.count({ where: { isInjured: true } });
  if (!quick) {
    try {
      const res = await fetch(`${ESPN_SITE_API}/injuries`);
      const data = (await res.json()) as { injuries?: Array<{ injuries?: unknown[] }> };
      const espnCount = (data.injuries ?? []).reduce((s, t) => s + (t.injuries?.length ?? 0), 0);
      Math.abs(espnCount - injuredDb) <= 3
        ? ok(`${injuredDb} blessé(s) en DB · ${espnCount} sur ESPN`)
        : warn(`${injuredDb} blessé(s) en DB · ${espnCount} sur ESPN → npm run db:update-injuries`);
    } catch (e) { warn(`Blessures ESPN indisponibles : ${e}`); }
  } else {
    console.log(`  ℹ️  ${injuredDb} blessé(s) en DB`);
  }

  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  if (errors === 0 && warnings === 0) console.log("✅  Tout est cohérent");
  else console.log(`${errors ? "❌" : "⚠️ "}  ${errors} erreur(s) · ${warnings} avertissement(s)`);
  console.log("═".repeat(60));
  process.exitCode = errors > 0 ? 1 : 0;
}

main()
  .catch((err) => { console.error("❌ Erreur fatale :", err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
