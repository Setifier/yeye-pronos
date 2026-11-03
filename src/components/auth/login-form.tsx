"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { signInEmailAction } from "@/actions/sign-in-email.action";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";

export const LoginForm = () => {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();

    setIsPending(true);

    const formData = new FormData(evt.target as HTMLFormElement);

    const { error } = await signInEmailAction(formData);

    if (error) {
      toast.error(error);
      setIsPending(false);
    } else {
      toast.success("Connexion réussie. Bon retour parmi nous !");
      // Retour à la page demandée avant la connexion (chemins internes uniquement)
      const target = new URLSearchParams(window.location.search).get("redirect");
      const safeTarget = target && target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
      // window.location pour forcer le rechargement et mettre à jour la navbar
      window.location.href = safeTarget;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {/* Email Field */}
      <div className="space-y-2">
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-zinc-300"
        >
          Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-zinc-500" />
          </div>
          <input
            type="email"
            id="login-email"
            name="email"
            required
            className="block w-full pl-10 pr-3 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent transition-all"
            placeholder="votre.email@exemple.fr"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-300"
          >
            Mot de passe
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-zinc-400 hover:text-[#5096ff] transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-zinc-500" />
          </div>
          <input
            type="password"
            id="password"
            name="password"
            required
            className="block w-full pl-10 pr-3 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2.5 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        {isPending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
};
