"use server";

import transporter from "@/lib/nodemailer";
import { getContactEmail } from "@/lib/legal";

/**
 * E-mails automatiques (confirmation d'adresse, mot de passe oublié, alertes admin).
 * Expéditeur « Yeye Pronos » (NODEMAILER_USER), mention « merci de ne pas répondre » ; le pied de page
 * renvoie vers CONTACT_EMAIL.
 */
export async function sendEmailAction({
  to,
  subject,
  meta,
}: {
  to: string;
  subject: string;
  meta: {
    description: string;
    link: string;
  };
}) {
  const contact = getContactEmail();
  const contactLine = contact
    ? `<br>Une question, un bug ? <a href="mailto:${contact}" style="color: #5096ff; text-decoration: none;">${contact}</a>`
    : "";

  const emailTemplate = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #09090b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">

              <!-- Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff5050 0%, #5096ff 50%, #dcff50 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    Yeye Pronos
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                    ${subject}
                  </h2>

                  <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                    ${meta.description}
                  </p>

                  <!-- Button -->
                  <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td style="border-radius: 8px; background-color: #5096ff;">
                        <a href="${meta.link}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                          Continuer →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 30px 0 0 0; font-size: 14px; color: #71717a;">
                    Si vous n'avez pas demandé cet email, vous pouvez l'ignorer en toute sécurité.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #0a0a0a; border-top: 1px solid #27272a; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #71717a;">
                    © ${new Date().getFullYear()} Yeye Pronos. Tous droits réservés.
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #52525b;">
                    E-mail automatique, merci de ne pas y répondre.${contactLine}
                  </p>
                </td>
              </tr>

            </table>

            <!-- Alternative Link (for email clients that don't support buttons) -->
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 20px;">
              <tr>
                <td style="text-align: center; padding: 20px;">
                  <p style="margin: 0; font-size: 12px; color: #71717a;">
                    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 12px; word-break: break-all;">
                    <a href="${meta.link}" style="color: #5096ff; text-decoration: none;">
                      ${meta.link}
                    </a>
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Version texte : un e-mail sans elle (HTML seul) est plus souvent classé en spam
  const plainDescription = meta.description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const text = [
    subject,
    "",
    plainDescription,
    "",
    meta.link,
    "",
    "Si tu n'as pas demandé cet e-mail, tu peux l'ignorer.",
    ...(contact ? [`Une question, un bug ? ${contact}`] : []),
  ].join("\n");

  const mailOptions = {
    from: {
      name: "Yeye Pronos",
      address: process.env.NODEMAILER_USER || "",
    },
    to,
    subject: `Yeye Pronos - ${subject}`,
    html: emailTemplate,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error("[sendEmail]", err);
    return { success: false };
  }
}
