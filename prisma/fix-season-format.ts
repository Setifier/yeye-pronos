/**
 * Matchs dont la saison n'est pas au format AAAA-AA (ex. « 2025 », restes d'anciens imports).
 * Aperçu par défaut ; --apply corrige :
 *   - doublon d'un match déjà rangé dans la bonne saison (mêmes équipes, même jour US) et sans prono → supprimé
 *   - sinon → saison corrigée d'après la date du match
 *
 * Usage :
 *   npm run db:fix-season-format              → aperçu, rien n'est modifié
 *   npm run db:fix-season-format -- --apply   → correction
 */

import "./load-env"; // doit rester le premier import
import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";
import { toEasternDateString } from "../src/lib/espn";

const H36 = 36 * 3600_000;

async function main() {
  const apply = process.argv.includes("--apply");

  const games = await prisma.game.findMany({
    where:   { NOT: { season: { contains: "-" } } },
    orderBy: { gameDate: "asc" },
    select: {
      id: true, externalId: true, season: true, seasonType: true, gameDate: true, status: true,
      homeScore: true, awayScore: true, homeTeamId: true, awayTeamId: true,
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
      _count:   { select: { predictions: true, playerStats: true } },
    },
  });

  console.log("═".repeat(60));
  console.log(apply ? "🛠️   CORRECTION DES SAISONS MAL FORMATÉES" : "👀  APERÇU — rien n'est modifié (ajouter --apply)");
  console.log("═".repeat(60));

  if (games.length === 0) {
    console.log("✅ Aucun match concerné");
    return;
  }

  let deleted = 0, moved = 0, skipped = 0;

  for (const g of games) {
    const season = getCurrentSeason(g.gameDate);
    const day    = toEasternDateString(g.gameDate);
    const score  = g.homeScore !== null && g.awayScore !== null ? ` ${g.awayScore}-${g.homeScore}` : "";
    console.log(
      `\n🏀 ${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation} · ${day} (ET) · ${g.seasonType} · ${g.status}${score}` +
      `\n   id ESPN ${g.externalId} · saison « ${g.season} » → ${season} · ${g._count.predictions} prono(s) · ${g._count.playerStats} ligne(s) de box score`
    );

    // Même affiche, même jour US, déjà rangée dans la bonne saison ?
    const candidates = await prisma.game.findMany({
      where: {
        id: { not: g.id }, season, homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId,
        gameDate: { gte: new Date(g.gameDate.getTime() - H36), lte: new Date(g.gameDate.getTime() + H36) },
      },
      select: { externalId: true, gameDate: true },
    });
    const twin = candidates.find((c) => toEasternDateString(c.gameDate) === day);

    if (twin && g._count.predictions > 0) {
      skipped++;
      console.log(`   ⚠️  Doublon de ${twin.externalId} mais avec des pronos : à traiter à la main`);
    } else if (twin) {
      deleted++;
      console.log(`   → doublon de ${twin.externalId} : supprimé`);
      if (apply) await prisma.game.delete({ where: { id: g.id } });
    } else {
      moved++;
      console.log(`   → rangé dans ${season}`);
      if (apply) await prisma.game.update({ where: { id: g.id }, data: { season } });
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`${deleted} doublon(s) à supprimer · ${moved} match(s) à reclasser · ${skipped} à vérifier`);
  console.log(apply ? "✅ Corrections appliquées" : "Pour corriger : npm run db:fix-season-format -- --apply");
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("\n❌ Erreur :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
