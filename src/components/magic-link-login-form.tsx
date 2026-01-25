"use client";

import { Sparkles, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

export default function MagicLinkLoginForm() {
  const [isPending, setIsPending] = useState(false);

  const ref = useRef<HTMLDetailsElement>(null);

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const formData = new FormData(evt.target as HTMLFormElement);
    const email = String(formData.get("email"));
    if (!email) return toast.error("L'email est requis");

    await signIn.magicLink({
      email,
      name: email.split("@")[0],
      callbackURL: "/dashboard",
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx: { error: { message: string } }) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          toast.success("Lien magique envoyé ! Vérifiez votre boîte mail.");
          if (ref.current) ref.current.open = false;
          (evt.target as HTMLFormElement).reset();
        },
      },
    });
  }

  return (
    <div>
      <details
        ref={ref}
        className="rounded-lg border border-purple-500/30 bg-purple-500/10 overflow-hidden transition-all hover:border-purple-500/50"
      >
        <summary className="flex gap-2 items-center px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-purple-300 hover:text-purple-200 transition cursor-pointer">
          <Sparkles size={16} />
          <span className="text-sm font-medium">Magic Link</span>
        </summary>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <label htmlFor="magic-link-email" className="sr-only">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="email"
              id="magic-link-email"
              name="email"
              placeholder="votre.email@exemple.fr"
              required
              className="block w-full pl-10 pr-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
          >
            {isPending ? "Envoi..." : "Envoyer le lien magique"}
          </button>
        </form>
      </details>
    </div>
  );
}
