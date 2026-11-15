/**
 * Meilleur marqueur ex æquo : rattrapage des matchs déjà notés.
 *
 * Jusqu'au 15/11/2026, un seul joueur comptait comme meilleur marqueur (le premier lu dans le box score) :
 * un prono sur un autre joueur à égalité ne gagnait pas son bonus (ni le combo). Désormais tous les joueurs
 * à égalité comptent (src/types/bonus.ts). Ce script retrouve les matchs concernés et redonne les points
 * manquants, avec la cote du soir du match (moyenne d'avant-match : getReferencePpgBefore).
 *
 * Usage :
 *   npm run db:fix-top-scorer-ties                       # saison en cours : affiche, ne modifie rien
 *   npm run db:fix-top-scorer-ties -- --apply            # enregistre les points
 *   npm run db:fix-top-scorer-ties -- --season=2025-26   # une autre saison
 *
 * Relançable sans risque : un prono déjà corrigé (bonus > 0) n'est plus touché.
 */

import { prisma } from "../src/lib/prisma";
import { getTopScorersByGame } from "../src/lib/top-scorers";
import { getReferencePpgBefore } from "../src/lib/player-odds";
import { calculateTotalPoints, type ScoreMarginCategory } from "../src/types/bonus";
import { getCurrentSeason } from "../src/types/season";

async function main() {
  const apply = process.argv.includes("--apply");
  const season = process.argv.find((a) => a.startsWith("--season="))?.split("=")[1] ?? getCurrentSeason();
  if (!/^\d{4}-\d{2}$/.test(season)) throw new Error(`Saison invalide : ${season} (format 2025-26)`);

  console.log("═".repeat(64));
  console.log(`⭐  MEILLEURS MARQUEURS EX ÆQUO — saison ${season}${apply ? "" : " (aperçu, rien n'est modifié)"}`);
  console.log("═".repeat(64));

  const games = await prisma.game.findMany({
    where:   { season, status: "FINAL", scoreMarginCategory: { not: null }, topScorerPoints: { not: null } },
    orderBy: { gameDate: "asc" },
    select: {
      id: true, gameDate: true, winnerId: true, topScorerId: true, topScorerPoints: true, scoreMarginCategory: true,
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  });
  const tops = await getTopScorersByGame(prisma, games);
  const tied = games.filter((g) => (tops.get(g.id)?.length ?? 0) > 1);
  console.log(`${games.length} matchs notés · ${tied.length} avec des meilleurs marqueurs ex æquo\n`);

  let fixed = 0;
  let given = 0;
  for (const g of tied) {
    const scorers = tops.get(g.id)!;
    const ids = scorers.map((s) => s.playerId);
    const day = g.gameDate.toLocaleDateString("fr-FR", { timeZone: "America/New_York", day: "2-digit", month: "2-digit" });
    console.log(`${day}  ${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation} · ${g.topScorerPoints} pts : ${scorers.map((s) => s.fullName).join(", ")}`);

    // Pronos sur un des joueurs à égalité, notés sans bonus marqueur
    const preds = await prisma.prediction.findMany({
      where: {
        gameId: g.id,
        result: { in: ["WON", "LOST"] },
        predictedTopScorerId: { in: ids },
        topScorerBonusPoints: 0,
      },
      select: {
        id: true, predictedTeamId: true, predictedScoreMargin: true, predictedTopScorerId: true, pointsEarned: true,
        user: { select: { name: true } },
        predictedTopScorer: { select: { fullName: true } },
      },
    });
    if (preds.length === 0) { console.log("     aucun prono à corriger"); continue; }

    const ppg = await getReferencePpgBefore(prisma, preds.map((p) => p.predictedTopScorerId!), season, g.gameDate);
    for (const p of preds) {
      const bonus = calculateTotalPoints({
        predictionWon:             p.predictedTeamId === g.winnerId,
        predictedMargin:           p.predictedScoreMargin as ScoreMarginCategory | null,
        actualMargin:              g.scoreMarginCategory as ScoreMarginCategory,
        predictedTopScorerId:      p.predictedTopScorerId,
        actualTopScorerId:         g.topScorerId,
        actualTopScorerIds:        ids,
        predictedTopScorerAverage: ppg.get(p.predictedTopScorerId!)?.ppg ?? 0,
      });
      const gain = bonus.total - p.pointsEarned;
      console.log(
        `     ${apply ? "✓" : "→"} ${p.user.name} · ${p.predictedTopScorer?.fullName} : +${bonus.topScorerBonus} marqueur` +
        (bonus.comboBonus ? ` +${bonus.comboBonus} combo` : "") + ` (total ${p.pointsEarned} → ${bonus.total})`
      );
      if (apply) {
        await prisma.prediction.update({
          where: { id: p.id },
          data: {
            pointsEarned:         bonus.total,
            marginBonusPoints:    bonus.marginBonus,
            topScorerBonusPoints: bonus.topScorerBonus,
            comboBonusPoints:     bonus.comboBonus,
          },
        });
      }
      fixed++;
      given += gain;
    }
  }

  console.log("\n" + "═".repeat(64));
  console.log(`${fixed} prono(s) ${apply ? "corrigé(s)" : "à corriger"} · ${given} point(s) ${apply ? "redonnés" : "à redonner"}`);
  if (!apply && fixed > 0) console.log("Rien n'a été modifié : relancer avec --apply pour enregistrer.");
  console.log("Le classement se met à jour tout seul (il est calculé à partir des pronos).");
  console.log("═".repeat(64));
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
