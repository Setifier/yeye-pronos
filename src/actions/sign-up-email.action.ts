"use server";

import { auth, ErrorCode } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { normalizeName } from "@/lib/utils";
import { translateAuthError } from "@/lib/auth-errors";

export async function signUpEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Indique ton adresse e-mail" };

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Choisis un mot de passe" };

  // Nom temporaire tiré de l'e-mail ; le vrai pseudo est choisi à l'onboarding.
  // Un préfixe sans lettres (ex. "12345@…") donnait un nom vide après nettoyage.
  const name = normalizeName(email.split("@")[0].replace(/[._]/g, " ")) || "Joueur";

  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    return { error: null };
  } catch (err) {
    console.error("Sign up error:", err);

    if (err instanceof APIError) {
      const errorCode = err.body ? (err.body.code as ErrorCode) : "UNKNOWN";
      return { error: translateAuthError(errorCode, err.message) };
    }

    return { error: "Erreur du serveur, réessaie dans un instant." };
  }
}
