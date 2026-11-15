/**
 * Nom court d'un joueur NBA pour les petits badges (client et serveur).
 *
 * Priorité au nom de famille d'ESPN (Player.lastName), toujours juste : « Porter Jr. », « Payton II »,
 * « da Silva », « Jones Garcia ». Sans lui, on part du nom complet en gardant le suffixe (Jr., III…)
 * et les particules (da, de, van…) : « Michael Porter Jr. » → « Porter Jr. » (et non « Jr. »).
 */

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
const PARTICLES = new Set(["da", "de", "del", "della", "der", "di", "do", "dos", "du", "la", "le", "van", "von", "st", "st."]);

export function shortPlayerName(fullName: string, lastName?: string | null): string {
  const last = lastName?.trim();
  if (last) return last;

  const words = fullName.trim().split(/\s+/);
  if (words.length <= 1) return fullName.trim();

  let start = words.length - 1;
  // « Porter Jr. » : le suffixe va avec le mot d'avant
  if (start > 1 && SUFFIXES.has(words[start].toLowerCase())) start--;
  // « da Silva », « de Larrea » : la particule fait partie du nom
  while (start > 1 && PARTICLES.has(words[start - 1].toLowerCase())) start--;
  return words.slice(start).join(" ");
}
