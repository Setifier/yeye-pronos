"use server";

import { auth, ErrorCode } from "@/lib/auth";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";
import { translateAuthError } from "@/lib/auth-errors";

export async function signInEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Indique ton adresse e-mail" };

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Indique ton mot de passe" };

  try {
    await auth.api.signInEmail({
      headers: await headers(),
      body: {
        email,
        password,
      },
    });

    return { error: null };
  } catch (err) {
    if (err instanceof APIError) {
      const errCode = err.body ? (err.body.code as ErrorCode) : "UNKNOWN";
      if (errCode === "EMAIL_NOT_VERIFIED") redirect("/auth/verify?error=email_not_verified");
      return { error: translateAuthError(errCode, err.message) };
    }
    return { error: "Erreur du serveur, réessaie dans un instant." };
  }
}
