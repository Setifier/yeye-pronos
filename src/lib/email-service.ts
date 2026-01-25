/**
 * Service d'envoi d'emails
 * Utilise Nodemailer (déjà configuré par Better Auth)
 */

import nodemailer from "nodemailer";
import { generateDailyDigestEmail, generateWelcomeEmail } from "./email-templates";

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  secure: process.env.EMAIL_SERVER_PORT === "465",
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoyer un email
 */
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html } = options;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@yeyepronos.com",
      to,
      subject,
      html,
    });

    console.log(`[Email] Envoyé à ${to}: ${subject}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Erreur envoi à ${to}:`, error);
    return { success: false, error };
  }
}

/**
 * Envoyer le digest hebdomadaire à un utilisateur
 */
export async function sendDailyDigest(params: {
  email: string;
  userName: string;
  data: Parameters<typeof generateDailyDigestEmail>[0];
}) {
  const { email, userName, data } = params;

  const html = generateDailyDigestEmail(data);

  return sendEmail({
    to: email,
    subject: "📊 Ton récap hebdomadaire NBA Pronos",
    html,
  });
}

/**
 * Envoyer l'email de bienvenue
 */
export async function sendWelcomeEmail(params: {
  email: string;
  userName: string;
}) {
  const { email, userName } = params;

  const html = generateWelcomeEmail(userName);

  return sendEmail({
    to: email,
    subject: "🎉 Bienvenue sur Yeye Pronos !",
    html,
  });
}

/**
 * Vérifier la configuration email
 */
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log("[Email] Configuration valide ✅");
    return true;
  } catch (error) {
    console.error("[Email] Configuration invalide ❌:", error);
    return false;
  }
}
