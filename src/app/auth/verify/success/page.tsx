import { EmailSentScreen } from "@/components/auth/email-sent-screen";

export default function VerifySuccessPage() {
  return (
    <EmailSentScreen title="E-mail renvoyé">
      <p>
        Un nouveau lien de confirmation vient de partir. Clique sur le bouton de l&apos;e-mail pour activer ton
        compte : tu seras connecté directement.
      </p>
      <p className="text-zinc-500">Le lien est valable 1 heure.</p>
    </EmailSentScreen>
  );
}
