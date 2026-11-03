/**
 * NBA Cup — tag des tours + inférence des groupes
 *
 * Phase 1 : scan ESPN → nbaCupRound ("GroupPlay" | "Quarterfinal" | "Semifinal" | "Championship")
 *           (l'import du calendrier tague déjà les tours ; cette phase sert de rattrapage)
 * Phase 2 : groupes inférés par composantes connexes des matchs de poule
 *           (ESPN ne donne pas le nom du groupe) → nbaCupGroup = "East-A" … "West-C"
 *           Les 60 matchs de poule sont connus dès la publication du calendrier,
 *           les groupes peuvent donc être calculés dès le début de saison.
 *
 * ⚠️ Les lettres A/B/C sont attribuées par ordre alphabétique de la première
 *    abréviation du groupe : elles peuvent différer des lettres officielles NBA.
 *
 * Usage :
 *   npm run db:backfill-nba-cup
 *   npm run db:backfill-nba-cup -- --season=2026-27
 *   npm run db:backfill-nba-cup -- --dry-run
 *   npm run db:backfill-nba-cup -- --skip-scan     (phase 2 seulement)
 */

import { prisma } from "../src/lib/prisma";
import { getGamesByDate, detectNbaCupRound, dateRangeInclusive, toEspnDate } from "../src/lib/espn";
import { getCurrentSeason, getSeasonStartYear } from "../src/types/season";
import { inferNbaCupGroups } from "../src/lib/nba-cup-groups";

const DELAY_MS = 300;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/** La NBA Cup se joue entre fin octobre et mi-décembre. */
function cupWindow(season: string) {
  const y = getSeasonStartYear(season);
  return { from: `${y}-10-15`, to: `${y}-12-31` };
}

// ─── Phase 1 ──────────────────────────────────────────────────────────────────

async function phase1Scan(season: string, dryRun: boolean) {
  const win   = cupWindow(season);
  const dates = dateRangeInclusive(win.from, win.to);
  console.log(`\n📡 Phase 1 — Scan ESPN ${win.from} → ${win.to} (${dates.length} dates)`);

  const tagged: Array<{ externalId: string; shortName: string; round: string }> = [];
  for (const date of dates) {
    try {
      const { events = [] } = await getGamesByDate(toEspnDate(date));
      for (const event of events) {
        const round = detectNbaCupRound(event.competitions?.[0]?.notes);
        if (round) tagged.push({ externalId: event.id, shortName: event.shortName, round });
      }
      process.stdout.write(events.length ? "●" : "·");
    } catch (e) {
      process.stdout.write("✗");
      console.error(`\n  ❌ ${date}:`, e);
    }
    await sleep(DELAY_MS);
  }

  const byRound = tagged.reduce<Record<string, number>>((a, t) => ({ ...a, [t.round]: (a[t.round] ?? 0) + 1 }), {});
  console.log(`\n✅ ${tagged.length} matchs NBA Cup sur ESPN : ${Object.entries(byRound).map(([r, n]) => `${r} ${n}`).join(" · ")}`);

  if (dryRun) return;

  let updated = 0, notInDb = 0;
  for (const { externalId, round } of tagged) {
    const game = await prisma.game.findUnique({ where: { externalId }, select: { id: true, nbaCupRound: true } });
    if (!game) { notInDb++; continue; } // ex. matchs TBD pas encore créés
    if (game.nbaCupRound !== round) {
      await prisma.game.update({ where: { id: game.id }, data: { nbaCupRound: round } });
      updated++;
    }
  }
  console.log(`💾 ${updated} match(s) mis à jour${notInDb ? ` · ${notInDb} pas encore en DB (équipes TBD)` : ""}`);
}

// ─── Phase 2 ──────────────────────────────────────────────────────────────────

async function phase2InferGroups(season: string, dryRun: boolean) {
  console.log(`\n🧩 Phase 2 — Inférence des groupes`);

  const r = await inferNbaCupGroups(prisma, season, { dryRun });
  if (r.games === 0) {
    console.log("  ℹ️  Aucun match de poule en base — lancer d'abord npm run db:seed-espn");
    return;
  }
  for (const [key, teams] of Object.entries(r.groups)) console.log(`  ${key} : ${teams.join(", ")}`);
  console.log(`  ${r.games} matchs de poule (60 attendus)${r.complete ? " ✅" : " ⚠️  calendrier incomplet : groupes non enregistrés"}`);

  if (dryRun) { console.log("\n[DRY RUN] Aucune modification."); return; }
  if (r.complete) console.log(`💾 ${r.updated} match(s) mis à jour avec leur groupe`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args     = process.argv.slice(2);
  const season   = args.find((a) => a.startsWith("--season="))?.split("=")[1] ?? getCurrentSeason();
  const dryRun   = args.includes("--dry-run");
  const skipScan = args.includes("--skip-scan");

  console.log(`🏆 NBA Cup — ${season}${dryRun ? "  [DRY RUN]" : ""}`);
  console.log("=".repeat(60));

  if (!skipScan) await phase1Scan(season, dryRun);
  await phase2InferGroups(season, dryRun);

  console.log(`\n🎉 Terminé`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("\n❌ Erreur fatale:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
