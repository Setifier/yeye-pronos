/** Messages d'erreur Better Auth traduits en français (codes les plus courants). */
const AUTH_ERRORS_FR: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou mot de passe incorrect.",
  INVALID_EMAIL: "Adresse e-mail invalide.",
  INVALID_PASSWORD: "Mot de passe incorrect.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse. Connecte-toi ou utilise « Mot de passe oublié ».",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse.",
  PASSWORD_TOO_SHORT: "Mot de passe trop court (8 caractères minimum).",
  PASSWORD_TOO_LONG: "Mot de passe trop long.",
  EMAIL_NOT_VERIFIED: "Adresse e-mail pas encore confirmée : vérifie ta boîte de réception.",
  USER_NOT_FOUND: "Aucun compte avec cette adresse.",
  FAILED_TO_CREATE_USER: "Impossible de créer le compte, réessaie dans un instant.",
  INVALID_TOKEN: "Lien invalide ou expiré.",
};

export function translateAuthError(code: string | undefined, fallback?: string): string {
  if (code && AUTH_ERRORS_FR[code]) return AUTH_ERRORS_FR[code];
  return fallback && /[éèàùç]|\b(le|la|les|une?|pas)\b/i.test(fallback)
    ? fallback // déjà en français (nos propres messages)
    : "Une erreur est survenue, réessaie dans un instant.";
}
