import { sendEmailAction } from "@/actions/send-email.action";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Prévient les administrateurs (ADMIN_EMAILS) par e-mail.
 * Ne fait rien sans problème à signaler ; ne lève jamais d'erreur (un CRON ne doit pas échouer à cause d'un e-mail).
 */
export async function alertAdmins(subject: string, problems: string[]): Promise<void> {
  const to = (process.env.ADMIN_EMAILS ?? "").split(";").map((e) => e.trim()).filter(Boolean);
  if (problems.length === 0 || to.length === 0 || !process.env.NODEMAILER_USER) return;

  const base = (process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
  const description = problems.map((p) => `• ${escapeHtml(p)}`).join("<br>");

  await Promise.all(
    to.map((email) =>
      sendEmailAction({ to: email, subject, meta: { description, link: `${base}/admin/dashboard` } }).catch(() => undefined)
    )
  );
}
