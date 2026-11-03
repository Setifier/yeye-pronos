import { LoginForm } from "@/components/auth/login-form";
import MagicLinkLoginForm from "@/components/auth/magic-link-login-form";
import { SignInOAuthButtons } from "@/components/auth/sign-in-oauth-buttons";
import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";

export default function LoginPage() {
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
              <LogIn className="h-6 w-6 text-[#5096ff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Connexion</h1>
              <p className="text-sm text-zinc-400">
                Connectez-vous à votre compte
              </p>
            </div>
          </div>

          {/* Magic Link */}
          <div className="mb-6">
            <MagicLinkLoginForm />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900/50 px-2 text-zinc-500">
                Ou continuer avec
              </span>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-[#5096ff] hover:text-[#5096ff]/80 transition-colors"
            >
              S&apos;inscrire
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
            <SignInOAuthButtons provider="google" />
            <SignInOAuthButtons provider="github" />
          </div>
        </div>
      </div>
    </div>
  );
}
