import Link from "next/link";
import { EmailSentScreen } from "@/components/auth/email-sent-screen";

export default function ForgotPasswordSuccessPage() {
  return (
    <EmailSentScreen
      title="E-mail envoyé"
      footer={
        <p className="text-sm text-zinc-400">
          Toujours rien ?{" "}
          <Link href="/auth/forgot-password" className="font-medium text-[#5096ff] hover:text-[#5096ff]/80">
            Redemander un lien
          </Link>
        </p>
      }
    >
      <p>
        Si un compte existe avec cette adresse, tu vas recevoir un lien pour{" "}
        <b className="text-white">choisir un nouveau mot de passe</b>.
      </p>
      <p className="text-zinc-500">Le lien est valable 1 heure.</p>
    </EmailSentScreen>
  );
}
