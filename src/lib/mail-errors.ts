/**
 * Traduit une erreur d'envoi Nodemailer / Gmail en phrase lisible pour l'admin.
 * Exemple : mot de passe d'application révoqué → « Gmail refuse la connexion… ».
 */
export function describeMailError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; responseCode?: number; response?: string; message?: string };
  const code = e.code ?? "";
  if (code === "EAUTH" || e.responseCode === 535 || e.responseCode === 534) {
    return "Gmail refuse la connexion : adresse ou mot de passe d'application incorrect (NODEMAILER_USER / NODEMAILER_APP_PASSWORD).";
  }
  if (["ESOCKET", "ECONNECTION", "ETIMEDOUT", "EDNS", "ECONNREFUSED"].includes(code)) {
    return "Impossible de joindre smtp.gmail.com (réseau). Réessaie dans un instant.";
  }
  if (e.responseCode === 421 || e.responseCode === 454 || (e.responseCode === 550 && /limit/i.test(e.response ?? ""))) {
    return "Gmail limite temporairement les envois de ce compte : réessaie plus tard.";
  }
  if (e.responseCode === 550 || e.responseCode === 553) {
    return `Adresse refusée par Gmail (${e.responseCode}).`;
  }
  return `Erreur Gmail : ${String(e.response ?? e.message ?? err).slice(0, 200)}`;
}
