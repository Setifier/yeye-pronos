/**
 * Suppression de comptes (ex. comptes de test avant la bêta).
 * Affiche d'abord ce qui sera supprimé ; ne supprime qu'avec --confirm.
 *
 * Supprimé avec le compte : sessions, connexions (Google…), pronos de match et paris de saison
 * de TOUTES les saisons, amis, ligues dont il est propriétaire (avec leurs membres).
 * Les données NBA (matchs, stats, classement NBA) ne sont pas touchées.
 *
 * Usage :
 *   npm run db:delete-users -- a@gmail.com b@gmail.com             → aperçu, rien n'est supprimé
 *   npm run db:delete-users -- a@gmail.com b@gmail.com --confirm   → suppression
 */

import "./load-env"; // doit rester le premier import
import { prisma } from "../src/lib/prisma";
import { getCurrentSeason } from "../src/types/season";

function countBy(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  if (counts.size === 0) return "aucun";
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([s, n]) => `${s} : ${n}`).join(" · ");
}

async function main() {
  const args    = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const emails  = [...new Set(args.filter((a) => !a.startsWith("--")).map((e) => e.trim().toLowerCase()))];

  if (emails.length === 0) {
    console.log("Usage : npm run db:delete-users -- email1 email2 [--confirm]");
    process.exit(1);
  }

  const season      = getCurrentSeason();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(";").map((e) => e.trim().toLowerCase()).filter(Boolean);

  const users = await prisma.user.findMany({
    where: { OR: emails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })) },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      ownedLeagues: { select: { id: true, name: true, _count: { select: { members: true } } } },
      _count: { select: { leagueMemberships: true, sentFriendRequests: true, receivedFriendRequests: true } },
    },
  });

  console.log("═".repeat(60));
  console.log(confirm ? "🗑️   SUPPRESSION DE COMPTES" : "👀  APERÇU — rien n'est supprimé (ajouter --confirm)");
  console.log("═".repeat(60));

  const found = new Set(users.map((u) => u.email.toLowerCase()));
  for (const e of emails.filter((e) => !found.has(e))) console.log(`\n❔ ${e} : aucun compte`);

  let losesHistory = false;
  for (const u of users) {
    const [preds, specials] = await Promise.all([
      prisma.prediction.findMany({ where: { userId: u.id }, select: { game: { select: { season: true } } } }),
      prisma.specialPrediction.findMany({ where: { userId: u.id }, select: { season: true } }),
    ]);
    const pastSeasons = [...new Set([...preds.map((p) => p.game.season), ...specials.map((s) => s.season)])]
      .filter((s) => s !== season);

    console.log(`\n👤 ${u.name} (${u.email}) · ${u.role} · créé le ${u.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`);
    console.log(`   Pronos de match : ${countBy(preds.map((p) => p.game.season))}`);
    console.log(`   Paris de saison : ${countBy(specials.map((s) => s.season))}`);
    console.log(`   Amis / demandes : ${u._count.sentFriendRequests + u._count.receivedFriendRequests} · ligues rejointes : ${u._count.leagueMemberships}`);
    for (const l of u.ownedLeagues) {
      console.log(`   Ligue possédée  : « ${l.name} » (${l._count.members} membre(s)) → supprimée avec le compte`);
    }
    if (pastSeasons.length > 0) {
      losesHistory = true;
      console.log(`   ⚠️  Historique perdu définitivement : ${pastSeasons.join(", ")}`);
    }
    if (u.role === "ADMIN" && !adminEmails.includes(u.email.toLowerCase())) {
      console.log("   ⚠️  Admin absent de ADMIN_EMAILS : le nouveau compte n'aura pas le rôle admin");
    }
  }

  if (users.length === 0) return;

  if (!confirm) {
    console.log("\n" + "─".repeat(60));
    if (losesHistory) console.log("⚠️  Des pronos de saisons passées seront perdus (pas d'archive possible ensuite).");
    console.log(`Pour supprimer : npm run db:delete-users -- ${emails.join(" ")} --confirm`);
    return;
  }

  for (const u of users) {
    await prisma.$transaction([
      // Ligues possédées d'abord (la relation propriétaire bloque sinon la suppression)
      prisma.privateLeague.deleteMany({ where: { ownerId: u.id } }),
      prisma.user.delete({ where: { id: u.id } }),
    ]);
    console.log(`✅ ${u.email} supprimé`);
  }
  console.log("\nRecréer les comptes via /auth/register. Rôle admin : attribué à la création si l'adresse est dans ADMIN_EMAILS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("\n❌ Erreur :", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
