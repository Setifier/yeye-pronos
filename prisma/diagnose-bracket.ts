/**
 * Script : Diagnostic du bracket playoff
 *
 * Affiche toutes les séries du bracket avec leur round, conference,
 * seeds et wins — pour identifier les données incorrectes.
 *
 * Usage :
 *   npm run db:diagnose-bracket
 *   npm run db:diagnose-bracket -- --season=2025-26
 */

import { prisma }           from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const args      = process.argv.slice(2);
  const seasonArg = args.find((a) => a.startsWith("--season="))?.split("=")[1];
  const season    = seasonArg ?? getCurrentSeason();

  console.log(`\n🏀  Diagnostic Bracket — Saison ${season}\n`);
  console.log("=".repeat(72));

  const allSeries = await prisma.playoffSeries.findMany({
    where: { season },
    include: {
      team1: { select: { abbreviation: true, conference: true } },
      team2: { select: { abbreviation: true, conference: true } },
    },
    orderBy: [{ round: "asc" }, { conference: "asc" }, { createdAt: "asc" }],
  });

  if (allSeries.length === 0) {
    console.log("  Aucune série trouvée.");
    return;
  }

  let currentRound = -1;

  for (const s of allSeries) {
    if (s.round !== currentRound) {
      currentRound = s.round ?? -1;
      console.log(`\n  ── Round ${s.round ?? "null"} ─────────────────────────────────────`);
      console.log(
        `  ${"Conférence".padEnd(10)} ${"Série".padEnd(16)} ${"Wins".padEnd(8)} ${"Seeds".padEnd(12)} Status`
      );
      console.log("  " + "─".repeat(60));
    }

    const name   = `${s.team1.abbreviation} vs ${s.team2.abbreviation}`;
    const wins   = `${s.team1Wins}-${s.team2Wins}`;
    const seeds  = `${s.team1Seed ?? "?"}v${s.team2Seed ?? "?"}`;
    const conf   = s.conference ?? "NULL ⚠️";
    const winner = s.winnerId
      ? `→ ${s.winnerId === s.team1Id ? s.team1.abbreviation : s.team2.abbreviation}`
      : "";

    const flags: string[] = [];
    if (s.round === null)       flags.push("NO ROUND ⚠️");
    if (!s.conference)          flags.push("NO CONF ⚠️");
    if (s.team1Seed === null)   flags.push("NO SEEDS ⚠️");

    console.log(
      `  ${conf.padEnd(10)} ${name.padEnd(16)} ${wins.padEnd(8)} ${seeds.padEnd(12)} ${s.status} ${winner} ${flags.join(" ")}`
    );
  }

  console.log("\n" + "=".repeat(72));
  console.log(`  Total : ${allSeries.length} série(s)\n`);

  // ── Quick summary ─────────────────────────────────────────────────────────
  const nullRound  = allSeries.filter((s) => s.round === null).length;
  const nullConf   = allSeries.filter((s) => !s.conference).length;
  const nullSeeds  = allSeries.filter((s) => s.round === 1 && s.team1Seed === null).length;

  if (nullRound)  console.log(`  ⚠️  ${nullRound} série(s) sans round`);
  if (nullConf)   console.log(`  ⚠️  ${nullConf} série(s) sans conférence`);
  if (nullSeeds)  console.log(`  ⚠️  ${nullSeeds} série(s) R1 sans seeds`);
  if (!nullRound && !nullConf && !nullSeeds) console.log("  ✅ Données structurelles OK");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Erreur :", err);
    process.exit(1);
  });
