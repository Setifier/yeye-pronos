/**
 * Import du calendrier NBA depuis ESPN (création + mise à jour des matchs)
 *
 * Même logique que le CRON (src/lib/game-sync.ts) :
 *   - présaison et matchs d'exhibition ignorés
 *   - matchs NBA Cup "TBD" ignorés (créés automatiquement quand les équipes sont connues)
 *   - tour NBA Cup tagué depuis les notes ESPN
 *   - séries playoffs créées automatiquement
 *   - idempotent : relançable sans doublon
 *
 * Usage :
 *   npm run db:seed-espn                                  → saison en cours (1er oct → 30 juin)
 *   npm run db:seed-espn -- --season=2026-27
 *   npm run db:seed-espn -- --from=2026-12-01 --to=2026-12-31
 *
 * Ensuite : npm run db:run-update  (traite les matchs déjà terminés : stats, pronos, classement)
 */

import { prisma } from "../src/lib/prisma";
import { syncSchedule } from "../src/lib/game-sync";
import { getCurrentSeason, getSeasonBounds } from "../src/types/season";

async function main() {
  const args    = process.argv.slice(2);
  const arg     = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const season  = arg("season") ?? getCurrentSeason();
  const bounds  = getSeasonBounds(season);
  const from    = arg("from") ?? bounds.start;
  const to      = arg("to") ?? bounds.end;

  console.log("═".repeat(60));
  console.log(`🏀  IMPORT CALENDRIER ESPN — ${season}`);
  console.log(`📅  ${from} → ${to}`);
  console.log("═".repeat(60));

  const teams = await prisma.team.count();
  if (teams !== 30) {
    console.error(`❌ ${teams} équipes en DB (30 attendues). Corriger les équipes avant d'importer.`);
    process.exit(1);
  }

  let lastMonth = "";
  const result = await syncSchedule(prisma, from, to, {
    delayMs: 250,
    onDate: (date, r) => {
      const month = date.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        process.stdout.write(`\n${month} `);
      }
      process.stdout.write(r.errors.length ? "✗" : r.espnGames === 0 ? "·" : "●");
    },
  });

  console.log("\n\n" + "─".repeat(60));
  console.log(`📅  ${result.dates} dates · ${result.espnGames} événements ESPN`);
  console.log(`✅  ${result.created} match(s) créé(s) · ${result.updated} mis à jour`);
  console.log(`⏭️   ${result.skipped.preseason} présaison · ${result.skipped.unknownTeam} TBD / hors NBA ignorés`);
  if (result.errors.length > 0) {
    console.log(`⚠️   ${result.errors.length} erreur(s) :`);
    for (const e of result.errors.slice(0, 20)) console.log(`     ${e}`);
  }

  // Contrôle rapide : nombre de matchs de saison régulière par équipe
  const games = await prisma.game.findMany({
    where:  { season, seasonType: "Regular Season" },
    select: { homeTeam: { select: { abbreviation: true } }, awayTeam: { select: { abbreviation: true } } },
  });
  const perTeam = new Map<string, number>();
  for (const g of games) {
    perTeam.set(g.homeTeam.abbreviation, (perTeam.get(g.homeTeam.abbreviation) ?? 0) + 1);
    perTeam.set(g.awayTeam.abbreviation, (perTeam.get(g.awayTeam.abbreviation) ?? 0) + 1);
  }
  const counts = [...perTeam.values()];
  console.log(
    `\n📊  Saison régulière en DB : ${games.length} matchs · ${perTeam.size} équipes · ` +
    `${counts.length ? Math.min(...counts) : 0}–${counts.length ? Math.max(...counts) : 0} matchs par équipe`
  );
  console.log("    (80 par équipe avant décembre ; 82 une fois les matchs post-NBA Cup ajoutés)");
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌ Erreur fatale :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
