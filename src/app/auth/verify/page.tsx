import { redirect } from "next/navigation";
import { EmailSentScreen } from "@/components/auth/email-sent-screen";
import { SendVerificationEmailForm } from "@/components/auth/send-verification-email-form";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    error: string;
  }>;
}

/**
 * Retour du lien de confirmation. Sans erreur : compte activé et connecté → profil à compléter.
 * Avec erreur (lien expiré, connexion avant confirmation…) : explication + renvoi de l'e-mail.
 */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const error = (await searchParams).error;

  if (!error) redirect("/onboarding");

  const expired = error === "invalid_token" || error === "token_expired";
  const notVerified = error === "email_not_verified";

  return (
    <EmailSentScreen
      problem
      title={expired ? "Lien expiré" : notVerified ? "Confirme ton adresse" : "Oups, un souci"}
      footer={<SendVerificationEmailForm label={expired ? "Recevoir un nouveau lien :" : "Renvoyer l'e-mail de confirmation :"} />}
    >
      {expired ? (
        <p>Ce lien de confirmation n&apos;est plus valable (il expire au bout d&apos;une heure). Demande-en un nouveau ci-dessous.</p>
      ) : notVerified ? (
        <p>
          Ton compte n&apos;est pas encore activé : clique sur le bouton de l&apos;e-mail de confirmation reçu à
          l&apos;inscription.
        </p>
      ) : (
        <p>La confirmation de ton adresse n&apos;a pas marché. Demande un nouveau lien ci-dessous.</p>
      )}
    </EmailSentScreen>
  );
}
