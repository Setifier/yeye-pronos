import { EmailSentScreen } from "@/components/auth/email-sent-screen";
import { SendVerificationEmailForm } from "@/components/auth/send-verification-email-form";

export default function RegisterSuccessPage() {
  return (
    <EmailSentScreen
      title="Plus qu'une étape !"
      footer={<SendVerificationEmailForm label="Toujours rien après quelques minutes ? Renvoie-le :" />}
    >
      <p>
        On vient de t&apos;envoyer un e-mail pour <b className="text-white">confirmer ton adresse</b>. Clique sur le
        bouton qu&apos;il contient : ton compte s&apos;active et tu es connecté directement.
      </p>
      <p className="text-zinc-500">Le lien est valable 1 heure.</p>
    </EmailSentScreen>
  );
}
