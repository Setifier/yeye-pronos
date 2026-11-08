"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import transporter from "@/lib/nodemailer";
import { getContactEmail } from "@/lib/legal";
import { getAppBaseUrl } from "@/lib/app-url";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Anti-abus simple : 5 signalements max par adresse IP et par tranche de 10 min (par instance serveur).
const recent = new Map<string, number[]>();
function tooManyReports(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  recent.set(ip, list);
  return list.length > 5;
}

export type BugReportResult = { ok: true } | { ok: false; error: string };

/**
 * Signalement de bug :
 *   1. enregistré en base (admin → Signalements) ;
 *   2. envoyé par e-mail à l'adresse de contact (CONTACT_EMAIL, à défaut le 1er ADMIN_EMAILS).
 * « Répondre » depuis la boîte de contact écrit directement à la personne (compte connecté ou e-mail saisi).
 */
export async function reportBugAction(input: {
  message: string;
  email?: string;
  page?: string;
  screen?: string;
  website?: string; // champ piège anti-robots : toujours vide pour un humain
}): Promise<BugReportResult> {
  if (input.website) return { ok: true }; // robot : on ne dit rien

  const message = (input.message ?? "").trim();
  if (message.length < MIN_LENGTH) return { ok: false, error: "Décrivez le problème en quelques mots (10 caractères minimum)." };
  if (message.length > MAX_LENGTH) return { ok: false, error: `Message trop long (${MAX_LENGTH} caractères maximum).` };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
  if (tooManyReports(ip)) return { ok: false, error: "Trop de signalements d'un coup : réessayez dans quelques minutes." };

  const session = await auth.api.getSession({ headers: h }).catch(() => null);
  const typed = (input.email ?? "").trim();
  const replyTo = session?.user.email ?? (EMAIL_RE.test(typed) ? typed : undefined);
  const page = input.page?.slice(0, 300) || null;
  const userAgent = h.get("user-agent")?.slice(0, 300) || null;
  const screen = input.screen?.slice(0, 30) || null;

  // 1. Base de données
  let stored = false;
  try {
    await prisma.bugReport.create({
      data: { message, page, userAgent, screen, email: replyTo ?? null, userId: session?.user.id ?? null },
    });
    stored = true;
  } catch (err) {
    console.error("[reportBug] Enregistrement :", err);
  }

  // 2. E-mail
  let mailed = false;
  const sender = process.env.NODEMAILER_USER;
  const to = getContactEmail() ?? (process.env.ADMIN_EMAILS ?? "").split(";").map((e) => e.trim()).filter(Boolean)[0];
  if (sender && to) {
    const who = session?.user
      ? `${session.user.name} (${session.user.email})`
      : typed ? `Visiteur non connecté (${typed})` : "Visiteur non connecté, sans e-mail";
    const rows: [string, string][] = [
      ["De", who],
      ["Page", page ?? "—"],
      ["Navigateur", userAgent ?? "—"],
      ["Écran", screen ?? "—"],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" })],
    ];
    const adminUrl = `${getAppBaseUrl()}/admin/bugs`;
    const html = `
      <div style="font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #18181b;">
        <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">${escapeHtml(message)}</p>
        <table style="font-size: 13px; color: #52525b; border-collapse: collapse;">
          ${rows.map(([k, v]) => `<tr><td style="padding: 3px 14px 3px 0; font-weight: 600; vertical-align: top;">${k}</td><td>${escapeHtml(v)}</td></tr>`).join("")}
        </table>
        <p style="margin: 20px 0 0 0; font-size: 13px;"><a href="${adminUrl}" style="color: #5096ff;">Voir tous les signalements dans l'admin</a></p>
      </div>`;
    const summary = message.replace(/\s+/g, " ");

    try {
      await transporter.sendMail({
        from:    { name: "Yeye Pronos", address: sender },
        to,
        replyTo,
        subject: `[Bug] ${summary.slice(0, 60)}${summary.length > 60 ? "…" : ""}`,
        html,
        text:    `${message}\n\n${rows.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\n${adminUrl}`,
      });
      mailed = true;
    } catch (err) {
      console.error("[reportBug] E-mail :", err);
    }
  }

  return stored || mailed ? { ok: true } : { ok: false, error: "L'envoi a échoué. Réessayez dans un instant." };
}
