import type { PrismaClient } from "@/generated/prisma";
import { getAppBaseUrl } from "@/lib/app-url";
import { getContactEmail } from "@/lib/legal";
import { getPreseasonDeadline } from "@/lib/special-bets";
import { IS_BETA } from "@/lib/beta";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

/**
 * E-mail d'invitation à rejoindre Yeye Pronos (Admin → Santé → « Inviter »).
 *
 * Mise en page en tableaux et styles en ligne : c'est ce que Gmail, Outlook et Apple Mail
 * affichent correctement. Fond sombre aux couleurs de l'app. Aperçu : /api/admin/invitation-preview.
 */

export interface InvitationEmail {
  subject: string;
  html: string;
  text: string;
}

interface InvitationInput {
  /** Prénom de l'admin qui invite (« Slim t'invite… »), null = formulation neutre. */
  inviterName: string | null;
  appUrl: string;
  seasonLabel: string;
  /** Date limite des paris de début de saison, seulement s'ils sont encore ouverts. */
  preseasonDeadline: Date | null;
  isBeta: boolean;
  contactEmail: string | null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Assemble l'e-mail avec les données du moment (saison, date limite des paris de saison). */
export async function prepareInvitationEmail(prisma: PrismaClient, inviterFullName: string | null): Promise<InvitationEmail> {
  const season = getCurrentSeason();
  const deadline = await getPreseasonDeadline(prisma, season).catch(() => null);
  const firstName = inviterFullName?.trim().split(/\s+/)[0] || null;
  return buildInvitationEmail({
    inviterName: firstName,
    appUrl: getAppBaseUrl(),
    seasonLabel: getSeasonLabel(season),
    preseasonDeadline: deadline && deadline.getTime() > Date.now() ? deadline : null,
    isBeta: IS_BETA,
    contactEmail: getContactEmail(),
  });
}

function formatDeadline(d: Date): string {
  const day = d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  return `${day} à ${time}`;
}

const FEATURES = [
  { emoji: "🏀", tint: "#3a1416", title: "Un clic par match",             text: "Choisis ton équipe avant le coup d'envoi. C'est tout." },
  { emoji: "🎯", tint: "#14213a", title: "Des bonus pour les audacieux",  text: "Écart final, meilleur marqueur : plus c'est osé, plus ça rapporte." },
  { emoji: "🏆", tint: "#2c3310", title: "Un classement, toute la saison", text: "Toi contre tes potes, nuit après nuit, jusqu'aux Finales." },
];

export function buildInvitationEmail(input: InvitationInput): InvitationEmail {
  const inviter = input.inviterName ? esc(input.inviterName) : null;
  const registerUrl = `${input.appUrl}/auth/register`;
  const host = input.appUrl.replace(/^https?:\/\//, "");
  const deadline = input.preseasonDeadline ? formatDeadline(input.preseasonDeadline) : null;
  const badge = input.isBeta ? `Accès bêta · saison test ${input.seasonLabel}` : `Saison ${input.seasonLabel}`;

  const subject = input.inviterName
    ? `${input.inviterName} t'invite sur Yeye Pronos 🏀`
    : "Rejoins Yeye Pronos 🏀";
  const preheader = "Chaque nuit, choisis tes vainqueurs NBA, marque des points et grimpe au classement entre potes.";
  const intro = inviter
    ? `<strong style="color:#ffffff;">${inviter}</strong> t'invite sur <strong style="color:#ffffff;">Yeye Pronos</strong>, le jeu de pronos NBA entre potes.`
    : `Rejoins <strong style="color:#ffffff;">Yeye Pronos</strong>, le jeu de pronos NBA entre potes.`;

  const features = FEATURES.map((f) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;background-color:#111113;border-radius:16px;">
                <tr>
                  <td width="56" valign="middle" style="padding:14px 0 14px 14px;">
                    <div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:12px;background-color:${f.tint};font-size:20px;">${f.emoji}</div>
                  </td>
                  <td valign="middle" style="padding:14px 16px 14px 12px;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${f.title}</p>
                    <p style="margin:3px 0 0;font-size:14px;line-height:1.45;color:#a1a1aa;">${esc(f.text)}</p>
                  </td>
                </tr>
              </table>`).join("");

  const deadlineBlock = deadline
    ? `
          <tr>
            <td style="padding:6px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#231a08;border:1px solid #4a3510;border-radius:16px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.5;color:#fcd34d;">
                    ⏳ <strong>Paris de début de saison</strong> (MVP, champion, classement…) ouverts jusqu'au ${esc(deadline)}. Il est encore temps&nbsp;!
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  const betaBlock = input.isBeta
    ? `
          <tr>
            <td style="padding:16px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px dashed #3f3f46;border-radius:16px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.55;color:#a1a1aa;">
                    🧪 <strong style="color:#ffffff;">Version bêta, saison test.</strong> Tu fais partie des premiers joueurs&nbsp;: quelques bugs peuvent encore traîner, un bouton «&nbsp;Signaler un bug&nbsp;» est là pour ça. Tes retours décident de la suite.
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  const why = inviter
    ? `Tu reçois cet e-mail parce que ${inviter} pense que ça va te plaire.`
    : "Tu reçois cet e-mail parce qu'on pense que ça va te plaire.";
  const contact = input.contactEmail
    ? `<br>Une question&nbsp;? <a href="mailto:${esc(input.contactEmail)}" style="color:#71717a;text-decoration:underline;">${esc(input.contactEmail)}</a>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#09090b" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:32px 12px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding:0 0 22px;">
              <a href="${input.appUrl}" style="text-decoration:none;"><img src="${input.appUrl}/logo.png" alt="Yeye Pronos" height="44" style="display:block;height:44px;width:auto;border:0;color:#ffffff;font-size:22px;font-weight:800;"></a>
            </td>
          </tr>

          <tr>
            <td bgcolor="#18181b" style="background-color:#18181b;border:1px solid #27272a;border-radius:24px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td height="4" style="height:4px;line-height:4px;font-size:0;background-color:#5096ff;background-image:linear-gradient(90deg,#ff5050 0%,#5096ff 50%,#dcff50 100%);border-radius:24px 24px 0 0;">&nbsp;</td>
                </tr>

                <tr>
                  <td align="center" style="padding:34px 28px 0;text-align:center;">
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:#16233a;color:#5096ff;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">${esc(badge)}</span>
                    <h1 style="margin:22px 0 0;font-size:34px;line-height:1.1;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Tu penses connaître la&nbsp;NBA&nbsp;?</h1>
                    <p style="margin:6px 0 0;font-size:34px;line-height:1.1;font-weight:900;color:#dcff50;letter-spacing:-0.5px;">Prouve-le.</p>
                    <p style="margin:20px 0 0;font-size:16px;line-height:1.6;color:#a1a1aa;">${intro} Chaque nuit, choisis tes vainqueurs, marque des points et grimpe au classement.</p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:28px 28px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#ff5050" style="border-radius:14px;background-color:#ff5050;">
                          <a href="${registerUrl}" style="display:inline-block;padding:16px 34px;font-size:17px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:14px;">Je rejoins la partie&nbsp;→</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;font-size:12px;color:#71717a;">Gratuit · sans pub · inscription en 30 secondes</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px 24px 4px;">${features}
                  </td>
                </tr>
${deadlineBlock}${betaBlock}
                <tr>
                  <td style="padding:28px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 16px 0;font-size:12px;line-height:1.6;color:#52525b;">
              ${why} Pas intéressé&nbsp;? Ignore-le, tu ne recevras rien d'autre.${contact}
              <br><a href="${input.appUrl}" style="color:#5096ff;text-decoration:none;">${esc(host)}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    input.inviterName ? `${input.inviterName} t'invite sur Yeye Pronos (${badge.toLowerCase()}).` : `Rejoins Yeye Pronos (${badge.toLowerCase()}).`,
    "",
    "Tu penses connaître la NBA ? Prouve-le.",
    "Chaque nuit, choisis les vainqueurs des matchs NBA, marque des points et grimpe au classement entre potes.",
    "",
    ...FEATURES.map((f) => `• ${f.title} : ${f.text}`),
    ...(deadline ? ["", `Paris de début de saison (MVP, champion, classement…) ouverts jusqu'au ${deadline}.`] : []),
    "",
    `Je rejoins la partie : ${registerUrl}`,
    ...(input.isBeta ? ["", "Version bêta, saison test : quelques bugs peuvent traîner, signale-les depuis l'appli."] : []),
    "",
    "Pas intéressé ? Ignore cet e-mail, tu ne recevras rien d'autre.",
  ].join("\n");

  return { subject, html, text };
}
