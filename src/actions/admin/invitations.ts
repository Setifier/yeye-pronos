"use server";

import { assertAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import transporter from "@/lib/nodemailer";
import { getValidDomains } from "@/lib/utils";
import { MAX_INVITES_PER_SEND, parseEmailList } from "@/lib/email-list";
import { prepareInvitationEmail } from "@/lib/emails/invitation-email";
import { describeMailError } from "@/lib/mail-errors";

export type InviteResult =
  | {
      ok: true;
      sent: string[];
      /** Déjà un compte avec cette adresse : rien envoyé. */
      alreadyRegistered: string[];
      /** Domaine refusé à l'inscription par e-mail (ALLOWED_EMAIL_DOMAINS) : rien envoyé. */
      refusedDomain: string[];
      invalid: string[];
      failed: string[];
      /** Raison donnée par Gmail pour le premier échec. */
      failedReason: string | null;
    }
  | { ok: false; error: string };

/**
 * Envoie l'invitation à l'admin lui-même (objet préfixé « [Test] ») pour voir le rendu dans sa boîte :
 * l'envoi normal ignore les adresses déjà inscrites, donc la sienne.
 */
export async function sendTestInvitationAction(): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  let admin: Awaited<ReturnType<typeof assertAdmin>>;
  try {
    admin = await assertAdmin();
  } catch {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  if (!process.env.NODEMAILER_USER || !process.env.NODEMAILER_APP_PASSWORD) {
    return { ok: false, error: "Envoi d'e-mails non configuré (NODEMAILER_USER / NODEMAILER_APP_PASSWORD)." };
  }
  try {
    const email = await prepareInvitationEmail(prisma, admin.name ?? null);
    await transporter.sendMail({
      from: { name: "Yeye Pronos", address: process.env.NODEMAILER_USER ?? "" },
      to: admin.email,
      subject: `[Test] ${email.subject}`,
      html: email.html,
      text: email.text,
    });
    return { ok: true, to: admin.email };
  } catch (err) {
    console.error("[invitations] test", err);
    return { ok: false, error: describeMailError(err) };
  }
}

/**
 * Envoie l'e-mail d'invitation à chaque adresse (un e-mail par personne : personne ne voit les autres).
 * Renvoie un résultat plutôt que de lever une erreur : en production, Next masque le message des erreurs.
 */
export async function sendInvitationsAction(raw: string): Promise<InviteResult> {
  let admin: Awaited<ReturnType<typeof assertAdmin>>;
  try {
    admin = await assertAdmin();
  } catch {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }

  if (!process.env.NODEMAILER_USER || !process.env.NODEMAILER_APP_PASSWORD) {
    return { ok: false, error: "Envoi d'e-mails non configuré (NODEMAILER_USER / NODEMAILER_APP_PASSWORD)." };
  }

  const { valid, invalid } = parseEmailList(raw);
  if (valid.length === 0) {
    return { ok: false, error: invalid.length ? "Aucune adresse valide." : "Ajoute au moins une adresse." };
  }
  if (valid.length > MAX_INVITES_PER_SEND) {
    return { ok: false, error: `${MAX_INVITES_PER_SEND} adresses maximum par envoi.` };
  }

  try {
    const existing = await prisma.user.findMany({ where: { email: { in: valid } }, select: { email: true } });
    const registered = new Set(existing.map((u) => u.email.toLowerCase()));
    const domains = new Set(getValidDomains());

    const alreadyRegistered = valid.filter((e) => registered.has(e));
    const refusedDomain = valid.filter((e) => !registered.has(e) && !domains.has(e.split("@")[1] ?? ""));
    const toSend = valid.filter((e) => !registered.has(e) && domains.has(e.split("@")[1] ?? ""));

    const sent: string[] = [];
    const failed: string[] = [];
    let failedReason: string | null = null;

    if (toSend.length > 0) {
      const email = await prepareInvitationEmail(prisma, admin.name ?? null);
      const from = { name: "Yeye Pronos", address: process.env.NODEMAILER_USER ?? "" };

      // Par paquets de 5 : rapide, sans saturer le SMTP de Gmail
      for (let i = 0; i < toSend.length; i += 5) {
        const chunk = toSend.slice(i, i + 5);
        const results = await Promise.allSettled(
          chunk.map((to) => transporter.sendMail({ from, to, subject: email.subject, html: email.html, text: email.text }))
        );
        results.forEach((r, j) => {
          if (r.status === "fulfilled") sent.push(chunk[j]);
          else {
            failed.push(chunk[j]);
            failedReason ??= describeMailError(r.reason);
            console.error("[invitations]", chunk[j], r.reason);
          }
        });
      }
    }

    console.info(`[invitations] ${sent.length} envoyée(s), ${failed.length} échec(s) — admin ${admin.id}`);
    return { ok: true, sent, alreadyRegistered, refusedDomain, invalid, failed, failedReason };
  } catch (err) {
    console.error("[invitations]", err);
    return { ok: false, error: describeMailError(err) };
  }
}
