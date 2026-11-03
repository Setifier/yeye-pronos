/**
 * Mise à jour manuelle complète — équivalent du CRON du matin, sans limite de temps.
 *
 * 1. Calendrier (J-N → J+7) : nouveaux matchs, horaires, reports, scores
 * 2. Tous les matchs terminés non traités : box scores, pronos, moyennes joueurs
 * 3. Classement + séries playoffs
 * 4. Effectifs + blessures
 *
 * Usage :
 *   npm run db:run-update                      → fenêtre J-3 → J+7
 *   npm run db:run-update -- --days=10         → fenêtre J-10 → J+7
 *   npm run db:run-update -- --no-sync         → seulement les matchs terminés déjà en DB
 *   npm run db:run-update -- --no-rosters      → sans effectifs/blessures
 *   npm run db:run-update -- --season=2026-27
 */

import { prisma } from "../src/lib/prisma";
import { runGamePipeline, defaultSyncWindow } from "../src/lib/game-processing";
import { syncRostersAndInjuries } from "../src/lib/roster-sync";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const args   = process.argv.slice(2);
  const arg    = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const season = arg("season") ?? getCurrentSeason();
  const days   = Math.max(0, parseInt(arg("days") ?? "3", 10));
  const noSync = args.includes("--no-sync");
  const noRosters = args.includes("--no-rosters");

  const window = defaultSyncWindow(new Date(), days, 7);

  console.log("═".repeat(60));
  console.log(`🏀  MISE À JOUR — Saison ${season}`);
  console.log(noSync ? "📅  Calendrier : non synchronisé (--no-sync)" : `📅  Calendrier : ${window.from} → ${window.to}`);
  console.log("═".repeat(60));

  const pipeline = await runGamePipeline(prisma, {
    season,
    syncFrom: noSync ? null : window.from,
    syncTo:   noSync ? null : window.to,
    log: (m) => console.log(m),
  });

  if (!noRosters) {
    console.log("");
    await syncRostersAndInjuries(prisma, { log: (m) => console.log(m) });
  }

  const done     = pipeline.processed.filter((g) => !g.deferred).length;
  const deferred = pipeline.processed.filter((g) => g.deferred).length;
  console.log("\n" + "─".repeat(60));
  console.log(`✅  ${done} match(s) traité(s)${deferred ? ` · ${deferred} en attente du box score ESPN` : ""}`);
  console.log(`📊  ${pipeline.standings} équipe(s) recalculée(s) · ${pipeline.remaining} match(s) encore à traiter`);
  console.log(`⏱️   ${(pipeline.durationMs / 1000).toFixed(1)} s`);
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("\n❌ Erreur fatale :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
