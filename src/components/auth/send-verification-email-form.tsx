"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Send } from "lucide-react";
import { sendVerificationEmail } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

/** « Renvoyer l'e-mail de confirmation » : nouvelle adresse saisie, nouveau lien (valable 1 heure). */
export const SendVerificationEmailForm = ({ label = "Renvoyer l'e-mail de confirmation" }: { label?: string }) => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const formData = new FormData(evt.target as HTMLFormElement);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) return toast.error("Indique ton adresse e-mail");

    await sendVerificationEmail({
      email,
      callbackURL: "/auth/verify",
      fetchOptions: {
        onRequest: () => setIsPending(true),
        onResponse: () => setIsPending(false),
        onError: () => {
          toast.error("L'e-mail n'est pas parti", { description: "Vérifie l'adresse, puis réessaie dans un instant." });
        },
        onSuccess: () => {
          toast.success("E-mail de confirmation renvoyé");
          router.push("/auth/verify/success");
        },
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="resend-email" className="block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Mail className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            type="email"
            id="resend-email"
            name="email"
            required
            autoComplete="email"
            placeholder="ton.email@exemple.fr"
            className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5096ff]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#5096ff] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#5096ff]/90 disabled:cursor-not-allowed disabled:bg-zinc-700"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? "Envoi…" : "Renvoyer"}
        </button>
      </div>
    </form>
  );
};
