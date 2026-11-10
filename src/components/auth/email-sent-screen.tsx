import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, MailWarning } from "lucide-react";

/**
 * Écran « regarde ta boîte mail » : après l'inscription, le mot de passe oublié, le renvoi de la confirmation,
 * ou un lien de confirmation expiré. Toujours avec les conseils anti-spam : nos e-mails partent d'une adresse
 * Gmail et arrivent souvent dans les spams au premier envoi.
 */
export function EmailSentScreen({
  title,
  children,
  footer,
  problem = false,
}: {
  title: string;
  children: ReactNode;
  /** Sous les conseils (ex. formulaire « Renvoyer l'e-mail »). */
  footer?: ReactNode;
  /** Lien expiré ou compte pas encore confirmé : icône d'alerte. */
  problem?: boolean;
}) {
  const Icon = problem ? MailWarning : MailCheck;
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/auth/login"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${problem ? "bg-amber-400/10" : "bg-[#5096ff]/10"}`}>
              <Icon className={`h-6 w-6 ${problem ? "text-amber-400" : "text-[#5096ff]"}`} />
            </div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>

          <SpamTips />

          {footer && <div className="mt-6 border-t border-zinc-800 pt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/** « Rien reçu ? » : spams, onglet Promotions, « Non spam », nom de l'expéditeur. */
function SpamTips() {
  const sender = process.env.NODEMAILER_USER;
  return (
    <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm">
      <p className="font-semibold text-amber-300">Rien reçu ?</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-zinc-400 marker:text-amber-400/60">
        <li>
          Patiente une minute, puis regarde dans les <b className="text-zinc-200">spams</b> (et l&apos;onglet{" "}
          <b className="text-zinc-200">Promotions</b> sur Gmail).
        </li>
        <li>
          Il y est ? Clique sur <b className="text-zinc-200">« Non spam »</b> : les prochains e-mails de Yeye Pronos
          arriveront au bon endroit.
        </li>
        {sender && (
          <li>
            Expéditeur : <b className="text-zinc-200">Yeye Pronos</b> <span className="break-all">({sender})</span>
          </li>
        )}
      </ul>
    </div>
  );
}
