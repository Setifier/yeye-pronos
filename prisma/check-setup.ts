/**
 * Contrôle de configuration avant mise en ligne (bêta).
 *
 * Vérifie sans rien modifier ni envoyer :
 *   1. Variables d'environnement (présence uniquement, aucune valeur affichée)
 *   2. URL publique de l'auth (BETTER_AUTH_URL) et rappels OAuth Google
 *   3. Base de données : connexion, 30 équipes, saison en cours chargée, comptes
 *   4. SMTP Gmail : connexion au serveur (aucun e-mail envoyé)
 *   5. Paris de début de saison : date limite
 *
 * Usage :
 *   npm run check:setup
 *   (pour la prod : lancer avec le .env de production, ex. `vercel env pull .env.production.local`)
 */

import "./load-env"; // doit rester le premier import
import nodemailer from "nodemailer";
import { prisma } from "../src/lib/prisma";
import { getCurrentSeason, getSeasonLabel } from "../src/types/season";
import { getPreseasonDeadline } from "../src/lib/special-bets";

let problems = 0;
const ok   = (m: string) => console.log(`  ✅ ${m}`);
const warn = (m: string) => console.log(`  ⚠️  ${m}`);
const fail = (m: string) => { problems++; console.log(`  ❌ ${m}`); };
const section = (t: string) => console.log(`\n${t}\n${"─".repeat(60)}`);

async function main() {
  console.log("═".repeat(60));
  console.log("🔧  CONTRÔLE DE CONFIGURATION");
  console.log("═".repeat(60));

  // 1. Variables d'environnement
  section("1. Variables d'environnement");
  const required: [string, string][] = [
    ["DATABASE_URL", "base de données"],
    ["BETTER_AUTH_SECRET", "chiffrement des sessions"],
    ["BETTER_AUTH_URL", "URL publique (liens des e-mails, OAuth)"],
    ["CRON_SECRET", "protection des CRON (Vercel l'envoie automatiquement)"],
    ["NODEMAILER_USER", "e-mails (vérification, mot de passe oublié)"],
    ["NODEMAILER_APP_PASSWORD", "mot de passe d'application Gmail"],
  ];
  const optional: [string, string][] = [
    ["GOOGLE_CLIENT_ID", "connexion Google"],
    ["GOOGLE_CLIENT_SECRET", "connexion Google"],
    ["ADMIN_EMAILS", "comptes administrateurs"],
    ["CONTACT_EMAIL", "adresse de contact des pages légales"],
    ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "avatars"],
    ["CLOUDINARY_API_KEY", "avatars"],
    ["CLOUDINARY_API_SECRET", "avatars"],
  ];
  for (const [k, role] of required) process.env[k] ? ok(`${k} (${role})`) : fail(`${k} manquant — ${role}`);
  for (const [k, role] of optional) process.env[k] ? ok(`${k} (${role})`) : warn(`${k} absent — ${role} indisponible`);
  if ((process.env.BETTER_AUTH_SECRET ?? "").length > 0 && (process.env.BETTER_AUTH_SECRET ?? "").length < 32) {
    warn("BETTER_AUTH_SECRET court : en générer un avec `openssl rand -base64 32`");
  }

  // 2. URL publique
  section("2. URL publique & OAuth");
  const url = process.env.BETTER_AUTH_URL ?? "";
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) fail(`BETTER_AUTH_URL doit être en https (${u.origin})`);
      else ok(`BETTER_AUTH_URL = ${u.origin}`);
      if (url.endsWith("/")) warn("BETTER_AUTH_URL se termine par « / » : à retirer");
      if (process.env.GOOGLE_CLIENT_ID) {
        console.log(`  ℹ️  Console Google → URI de redirection autorisée : ${u.origin}/api/auth/callback/google`);
      }
    } catch {
      fail(`BETTER_AUTH_URL invalide : ${url}`);
    }
  }

  // 3. Base de données
  section("3. Base de données");
  try {
    const season = getCurrentSeason();
    const [teams, games, players, users, verified, onboarded] = await Promise.all([
      prisma.team.count(),
      prisma.game.count({ where: { season, seasonType: "Regular Season" } }),
      prisma.player.count({ where: { teamId: { not: null } } }),
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { hasCompletedOnboarding: true } }),
    ]);
    ok("Connexion OK");
    teams === 30 ? ok("30 équipes") : fail(`${teams} équipes (30 attendues)`);
    games >= 1200 ? ok(`Saison ${getSeasonLabel(season)} : ${games} matchs de saison régulière`) : fail(`Saison ${season} : ${games} matchs → npm run db:seed-espn`);
    players >= 420 ? ok(`${players} joueurs sous contrat`) : fail(`${players} joueurs sous contrat → npm run db:update-rosters`);
    console.log(`  ℹ️  ${users} compte(s) · ${verified} e-mail vérifié · ${onboarded} profil(s) complété(s)`);
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    admins > 0 ? ok(`${admins} administrateur(s)`) : warn("Aucun administrateur (ADMIN_EMAILS appliqué à la création du compte)");
  } catch (err) {
    fail(`Base de données inaccessible : ${err instanceof Error ? err.message : err}`);
  }

  // 4. SMTP
  section("4. E-mails (SMTP Gmail)");
  if (process.env.NODEMAILER_USER && process.env.NODEMAILER_APP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: process.env.NODEMAILER_USER, pass: process.env.NODEMAILER_APP_PASSWORD },
    });
    try {
      await transporter.verify();
      ok("Connexion SMTP OK (aucun e-mail envoyé)");
    } catch (err) {
      fail(`SMTP refusé : ${err instanceof Error ? err.message : err} — vérifier le mot de passe d'application Gmail`);
    }
  } else {
    fail("SMTP non configuré : les inscriptions par e-mail ne pourront pas être validées");
  }

  // 5. Paris de saison
  section("5. Paris de début de saison");
  try {
    const season = getCurrentSeason();
    const deadline = await getPreseasonDeadline(prisma, season);
    const label = deadline.toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    Date.now() < deadline.getTime() ? ok(`Ouverts jusqu'au ${label} (Paris)`) : warn(`Fermés depuis le ${label}`);
    const count = await prisma.specialPrediction.count({ where: { season } });
    console.log(`  ℹ️  ${count} pari(s) de saison enregistré(s) pour ${season}`);
  } catch (err) {
    fail(`Paris de saison : ${err instanceof Error ? err.message : err}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log(problems === 0 ? "✅  Configuration prête" : `❌  ${problems} problème(s) à corriger`);
  console.log("═".repeat(60));
  process.exitCode = problems ? 1 : 0;
}

main()
  .catch((err) => { console.error("❌ Erreur fatale :", err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
