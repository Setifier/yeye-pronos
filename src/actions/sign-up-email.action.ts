"use server";

import { auth, ErrorCode } from "@/lib/auth";
import { APIError } from "better-auth/api";

export async function signUpEmailAction(formData: FormData) {
  const email = String(formData.get("email"));
  if (!email) return { error: "Veuillez entrer votre email" };

  // Utiliser le préfixe email comme nom temporaire
  // Le vrai nom sera configuré lors de l'onboarding
  const name = email.split("@")[0];

  const password = String(formData.get("password"));
  if (!password) return { error: "Veuillez entrer votre mot de passe" };

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
    // Log l'erreur pour débugger
    console.error("Sign up error:", err);

    if (err instanceof APIError) {
      const errorCode = err.body ? (err.body.code as ErrorCode) : "UNKNOWN";

      switch (errorCode) {
        default:
          return { error: err.message };
      }
    }

    // Retourner le message d'erreur original si disponible
    const errorMessage = err instanceof Error ? err.message : "Erreur interne du serveur";
    console.error("Unhandled error during sign up:", errorMessage);
    return { error: errorMessage };
  }
}
