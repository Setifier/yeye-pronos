/**
 * Mise en forme pour l'admin (utilisable côté serveur et client). Heures toujours en heure de Paris.
 */

const PARIS = "Europe/Paris";

/** "il y a 5 min", "il y a 3 h", "hier à 09:12", "mar. 28 oct." */
export function formatAgo(iso: string | Date, now: number = Date.now()): string {
  const date = new Date(iso);
  const diff = now - date.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "à l’instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 20) return `il y a ${h} h`;

  const day = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: PARIS });
  const yesterday = new Date(now - 86_400_000);
  if (day(date) === day(yesterday)) return `hier à ${formatParisTimeOnly(date)}`;
  if (day(date) === day(new Date(now))) return `aujourd’hui à ${formatParisTimeOnly(date)}`;
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { timeZone: PARIS, weekday: "short", day: "numeric", month: "short" });
}

/** "09:12" */
export function formatParisTimeOnly(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { timeZone: PARIS, hour: "2-digit", minute: "2-digit" });
}

/** "mar. 3 nov. · 09:12" */
export function formatParisDateTime(iso: string | Date): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { timeZone: PARIS, weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${formatParisTimeOnly(d)}`;
}

/** "3 nov. 2026" */
export function formatParisDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: PARIS, day: "numeric", month: "short", year: "numeric" });
}

/** "7,5 s", "42 s", "1 min 05" */
export function formatDuration(ms: number): string {
  if (ms < 10_000) return `${(ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`;
}

/** "iPhone · Safari", "Windows · Chrome" */
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return "Appareil inconnu";
  const os =
    /iPhone/.test(ua) ? "iPhone" :
    /iPad/.test(ua) ? "iPad" :
    /Android/.test(ua) ? "Android" :
    /Windows/.test(ua) ? "Windows" :
    /Macintosh|Mac OS X/.test(ua) ? "Mac" :
    /Linux/.test(ua) ? "Linux" : "Autre";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Firefox\/|FxiOS/.test(ua) ? "Firefox" :
    /SamsungBrowser/.test(ua) ? "Samsung Internet" :
    /CriOS|Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) ? "Safari" : "navigateur inconnu";
  return `${os} · ${browser}`;
}
