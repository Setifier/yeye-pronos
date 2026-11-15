/**
 * Trophées NBA d'une saison (client et serveur) : clés, libellés, identifiants ESPN, regroupement à l'écran.
 * Données : table NbaAward, remplie par src/lib/nba-awards-sync.ts (ESPN) ; entraîneur de l'année saisi dans l'admin.
 */

import type { AwardKey } from "@/types/special-predictions";

export type NbaAwardGroup = "season" | "playoffs" | "teams" | "cup" | "allstar";

export interface NbaAwardDef {
  key: string;
  label: string;
  /** Identifiant du trophée chez ESPN (sports.core.api.espn.com …/seasons/{année}/awards/{id}) ; null = saisi à la main */
  espnId: number | null;
  group: NbaAwardGroup;
  /** Équipe de 5 (All-NBA…) plutôt qu'un seul lauréat */
  team?: boolean;
  /** Quand il tombe, pour « À venir » */
  when: string;
  /** Trophée sur lequel on parie en début de saison (table SeasonAwardResult, notation des paris) */
  bet?: AwardKey;
}

export const NBA_AWARDS: NbaAwardDef[] = [
  // Trophées individuels de la saison régulière
  { key: "MVP",        label: "MVP",                          espnId: 33,   group: "season",   when: "fin mai",       bet: "MVP" },
  { key: "DPOY",       label: "Défenseur de l'année",         espnId: 39,   group: "season",   when: "fin avril",     bet: "DPOY" },
  { key: "ROY",        label: "Rookie de l'année",            espnId: 35,   group: "season",   when: "fin avril",     bet: "ROOKIE" },
  { key: "SMOY",       label: "6e homme de l'année",          espnId: 40,   group: "season",   when: "avril" },
  { key: "MIP",        label: "Meilleure progression",        espnId: 36,   group: "season",   when: "avril" },
  { key: "CLUTCH",     label: "Joueur clutch de l'année",     espnId: 297,  group: "season",   when: "avril" },
  { key: "COY",        label: "Entraîneur de l'année",        espnId: null, group: "season",   when: "avril" },
  { key: "TEAMMATE",   label: "Coéquipier de l'année",        espnId: 77,   group: "season",   when: "mai" },

  // Playoffs
  { key: "FINALS_MVP", label: "MVP des Finales",              espnId: 43,   group: "playoffs", when: "juin",          bet: "FINALS_MVP" },
  { key: "ECF_MVP",    label: "MVP de la finale de l'Est",    espnId: 218,  group: "playoffs", when: "fin mai" },
  { key: "WCF_MVP",    label: "MVP de la finale de l'Ouest",  espnId: 217,  group: "playoffs", when: "fin mai" },

  // Équipes de la saison
  { key: "ALL_NBA_1",    label: "All-NBA · 1re équipe",          espnId: 44, group: "teams", team: true, when: "mai" },
  { key: "ALL_NBA_2",    label: "All-NBA · 2e équipe",           espnId: 45, group: "teams", team: true, when: "mai" },
  { key: "ALL_NBA_3",    label: "All-NBA · 3e équipe",           espnId: 46, group: "teams", team: true, when: "mai" },
  { key: "ALL_DEF_1",    label: "All-Defensive · 1re équipe",    espnId: 49, group: "teams", team: true, when: "mai" },
  { key: "ALL_DEF_2",    label: "All-Defensive · 2e équipe",     espnId: 50, group: "teams", team: true, when: "mai" },
  { key: "ALL_ROOKIE_1", label: "All-Rookie · 1re équipe",       espnId: 47, group: "teams", team: true, when: "mai" },
  { key: "ALL_ROOKIE_2", label: "All-Rookie · 2e équipe",        espnId: 48, group: "teams", team: true, when: "mai" },

  // NBA Cup
  { key: "CUP_MVP",    label: "MVP de la NBA Cup",            espnId: 377,  group: "cup",      when: "mi-décembre" },
  { key: "CUP_TEAM",   label: "Équipe type du tournoi",       espnId: 378,  group: "cup",      team: true, when: "mi-décembre" },

  // All-Star Game
  { key: "ALL_STAR_MVP", label: "MVP du All-Star Game",       espnId: 53,   group: "allstar",  when: "février" },
];

export const NBA_AWARD_GROUPS: { key: NbaAwardGroup; label: string }[] = [
  { key: "season",   label: "Trophées de la saison" },
  { key: "playoffs", label: "Playoffs" },
  { key: "teams",    label: "Équipes de la saison" },
  { key: "cup",      label: "NBA Cup" },
  { key: "allstar",  label: "All-Star Game" },
];

export function nbaAwardDef(key: string): NbaAwardDef | undefined {
  return NBA_AWARDS.find((a) => a.key === key);
}

/** Un lauréat tel qu'affiché (données de la table NbaAward). */
export interface NbaAwardWinner {
  award: string;
  rank: number;
  name: string;
  teamAbbr: string | null;
  headshot: string | null;
  /** Joueur de la base (lien vers sa fiche NBA) */
  playerId: string | null;
  source: string;
}
