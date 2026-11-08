import { RegisterForm } from "@/components/auth/register-form";
import { SignInOAuthButtons } from "@/components/auth/sign-in-oauth-buttons";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        {/* Main Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5096ff]/10">
              <UserPlus className="h-6 w-6 text-[#5096ff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Inscription</h1>
              <p className="text-sm text-zinc-400">
                Créez votre compte Yeye Pronos
              </p>
            </div>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            Vous avez déjà un compte ?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-[#5096ff] hover:text-[#5096ff]/80 transition-colors"
            >
              Se connecter
            </Link>
          </p>

          {/* OAuth Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900/50 px-2 text-zinc-500">
                Ou avec
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <SignInOAuthButtons signUp provider="google" />
          </div>

          {/* Acceptation des conditions (vaut aussi pour l'inscription avec Google) */}
          <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
            En créant un compte, vous acceptez les{" "}
            <Link href="/legal/cgu" className="text-zinc-300 underline-offset-2 hover:underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/legal/confidentialite" className="text-zinc-300 underline-offset-2 hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
