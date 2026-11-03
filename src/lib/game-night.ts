/**
 * "Nuit NBA" — convention de dates commune à toute l'application (client et serveur).
 *
 * Un match appartient à la date US Eastern de son coup d'envoi (convention NBA).
 * Vu de Paris, les matchs du 28 (ET) se jouent dans la soirée/nuit du 28 au 29 :
 * on l'affiche "Nuit du mar. 28 au mer. 29 oct.".
 *
 * La nuit "en cours" = date US Eastern de l'instant présent :
 *   - 08h Paris le 29  → 02h ET le 29 → nuit du 29 (matchs de ce soir, à parier)
 *   - 03h Paris le 29  → 21h ET le 28 → nuit du 28 (matchs en cours, derniers paris possibles)
 */

const PARIS = "Europe/Paris";
const NEW_YORK = "America/New_York";

/** Date US Eastern (YYYY-MM-DD) d'un instant. */
export function toNightDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: NEW_YORK });
}

/** Nuit NBA en cours. */
export function getCurrentNightDate(now: Date = new Date()): string {
  return toNightDate(now);
}

export function shiftNightDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Date locale (minuit, fuseau du navigateur) correspondant à une date YYYY-MM-DD. */
export function nightDateToLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date locale du navigateur → YYYY-MM-DD (sans conversion de fuseau). */
export function localDateToNightDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function utcNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

/**
 * Libellés d'une nuit NBA.
 *   short : "mar. 28 oct."
 *   night : "Nuit du mar. 28 au mer. 29 oct."
 *   relative : "Ce soir" / "Hier soir" / "Demain soir" / null
 */
export function formatNight(isoDate: string, now: Date = new Date()) {
  const day  = utcNoon(isoDate);
  const next = utcNoon(shiftNightDate(isoDate, 1));
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("fr-FR", { timeZone: "UTC", ...opts });

  const sameMonth = day.getUTCMonth() === next.getUTCMonth();
  const night = sameMonth
    ? `Nuit du ${fmt(day, { weekday: "short", day: "numeric" })} au ${fmt(next, { weekday: "short", day: "numeric", month: "short" })}`
    : `Nuit du ${fmt(day, { weekday: "short", day: "numeric", month: "short" })} au ${fmt(next, { weekday: "short", day: "numeric", month: "short" })}`;

  const current = getCurrentNightDate(now);
  const relative =
    isoDate === current ? "Ce soir" :
    isoDate === shiftNightDate(current, -1) ? "Hier soir" :
    isoDate === shiftNightDate(current, 1) ? "Demain soir" : null;

  return {
    short: fmt(day, { weekday: "short", day: "numeric", month: "short" }),
    long:  fmt(day, { weekday: "long", day: "numeric", month: "long" }),
    night,
    relative,
  };
}

/** "01:30" (heure de Paris) */
export function formatParisTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("fr-FR", { timeZone: PARIS, hour: "2-digit", minute: "2-digit" });
}

/** "mer. 29 · 01:30" (heure de Paris) */
export function formatParisDayTime(date: Date | string): string {
  const d = new Date(date);
  const day = d.toLocaleDateString("fr-FR", { timeZone: PARIS, weekday: "short", day: "numeric" });
  return `${day} · ${formatParisTime(d)}`;
}

/** "19:30" (heure de New York) */
export function formatEasternTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("fr-FR", { timeZone: NEW_YORK, hour: "2-digit", minute: "2-digit" });
}

/** Compte à rebours lisible : "2 h 15", "45 min", "moins d'1 min", "3 j" */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "terminé";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "moins d'1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) {
    const rest = min % 60;
    return rest ? `${h} h ${String(rest).padStart(2, "0")}` : `${h} h`;
  }
  const d = Math.floor(h / 24);
  return `${d} j${h % 24 ? ` ${h % 24} h` : ""}`;
}
