/**
 * Mise à jour des effectifs NBA (30 rosters ESPN → Player)
 *
 * Même logique que le CRON (src/lib/roster-sync.ts) :
 *   - équipe, poste, numéro, photo, taille/poids, université, pays
 *   - nouveaux joueurs (rookies, two-way, signatures) créés
 *   - transferts détectés et affichés
 *   - agents libres : joueurs absents des 30 rosters (seulement si les 30 rosters sont OK)
 *
 * Usage :
 *   npm run db:update-rosters
 *   npm run db:update-rosters -- --no-free-agents   (ne retire personne de son équipe)
 */

import { prisma } from "../src/lib/prisma";
import { syncRosters } from "../src/lib/roster-sync";

async function main() {
  const markFreeAgents = !process.argv.includes("--no-free-agents");

  console.log("═".repeat(60));
  console.log("🏀  MISE À JOUR DES EFFECTIFS NBA");
  console.log("═".repeat(60));

  const r = await syncRosters(prisma, { markFreeAgents, log: (m) => console.log(m) });

  console.log("\n📋  Joueurs par équipe :");
  const line = Object.entries(r.perTeam)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([abbr, n]) => `${abbr} ${n}${n < 14 || n > 18 ? " ⚠️" : ""}`);
  for (let i = 0; i < line.length; i += 6) console.log("   " + line.slice(i, i + 6).join("  ·  "));

  const [withTeam, total] = await Promise.all([
    prisma.player.count({ where: { teamId: { not: null } } }),
    prisma.player.count(),
  ]);
  console.log("\n" + "─".repeat(60));
  console.log(`📊  ${withTeam} joueurs sous contrat · ${total - withTeam} sans équipe · ${total} au total`);
  console.log("    (attendu : 14 à 18 joueurs par équipe — 15 contrats standard + 3 two-way max)");
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌ Erreur fatale :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
