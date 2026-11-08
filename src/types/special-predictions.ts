/**
 * Types, constantes et barèmes pour les paris spéciaux (hors matchs individuels).
 */

// ─── Identifiants des types de paris ──────────────────────────────────────────

export const SPECIAL_PRED_TYPES = {
  // Présaison
  PRESEASON_NBA_CUP_CHAMPION: "PRESEASON_NBA_CUP_CHAMPION",
  PRESEASON_MVP_SEASON:        "PRESEASON_MVP_SEASON",
  PRESEASON_DPOY:              "PRESEASON_DPOY",
  PRESEASON_ROOKIE:            "PRESEASON_ROOKIE",
  PRESEASON_NBA_STANDINGS:     "PRESEASON_NBA_STANDINGS",
  PRESEASON_BRACKET:           "PRESEASON_BRACKET",

  // En cours de saison / postseason
  POSTSEASON_PLAYIN:           "POSTSEASON_PLAYIN",
  POSTSEASON_PLAYOFFS_R1:      "POSTSEASON_PLAYOFFS_R1",
  POSTSEASON_PLAYOFFS_R2:      "POSTSEASON_PLAYOFFS_R2",
  POSTSEASON_PLAYOFFS_CF:      "POSTSEASON_PLAYOFFS_CF",
  POSTSEASON_PLAYOFFS_FINALS:  "POSTSEASON_PLAYOFFS_FINALS",
} as const;

export type SpecialPredType = typeof SPECIAL_PRED_TYPES[keyof typeof SPECIAL_PRED_TYPES];

// ─── Statuts ──────────────────────────────────────────────────────────────────

export type SpecialPredStatus = "OPEN" | "LOCKED" | "GRADED";

// ─── Fenêtres d'ouverture / fermeture ─────────────────────────────────────────

export const SPECIAL_PRED_WINDOWS: Record<SpecialPredType, {
  label:       string;
  description: string;
  opens:       string;  // Description texte de la fenêtre
  closes:      string;
  category:    "preseason" | "postseason";
}> = {
  PRESEASON_NBA_CUP_CHAMPION: {
    label:       "Champion NBA Cup",
    description: "Choisis l'équipe qui remportera la NBA Cup",
    opens:       "Début de saison",
    closes:      "Coup d'envoi du premier match de la saison",
    category:    "preseason",
  },
  PRESEASON_MVP_SEASON: {
    label:       "MVP de la saison",
    description: "Choisis le MVP de la saison régulière",
    opens:       "Début de saison",
    closes:      "Coup d'envoi du premier match de la saison",
    category:    "preseason",
  },
  PRESEASON_DPOY: {
    label:       "Défenseur de l'année",
    description: "Choisis le meilleur défenseur de la saison (DPOY)",
    opens:       "Début de saison",
    closes:      "Coup d'envoi du premier match de la saison",
    category:    "preseason",
  },
  PRESEASON_ROOKIE: {
    label:       "Rookie de l'année",
    description: "Choisis le meilleur rookie de la saison",
    opens:       "Début de saison",
    closes:      "Coup d'envoi du premier match de la saison",
    category:    "preseason",
  },
  PRESEASON_NBA_STANDINGS: {
    label:       "Classement NBA",
    description: "Classe les 15 équipes de chaque conférence (classement final de la saison régulière)",
    opens:       "Début de saison",
    closes:      "Coup d'envoi du premier match de la saison",
    category:    "preseason",
  },
  PRESEASON_BRACKET: {
    label:       "Bracket Play-in + Playoffs",
    description: "Complète le bracket du Play-in jusqu'au titre, à partir de ton classement",
    opens:       "Début de saison",
    closes:      "Coup d'envoi du premier match de la saison",
    category:    "preseason",
  },
  POSTSEASON_PLAYIN: {
    label:       "Play-in",
    description: "Prédisez les 7e et 8e de chaque conférence",
    opens:       "Lendemain du dernier match de saison régulière",
    closes:      "Début du premier match Play-in",
    category:    "postseason",
  },
  POSTSEASON_PLAYOFFS_R1: {
    label:       "Playoffs — 1er tour",
    description: "Prédisez les 8 séries du premier tour (vainqueur + nombre de matchs)",
    opens:       "Fin du Play-in (7e et 8e connus)",
    closes:      "Début du premier match des playoffs",
    category:    "postseason",
  },
  POSTSEASON_PLAYOFFS_R2: {
    label:       "Playoffs — 2e tour",
    description: "Prédisez les 4 séries du 2e tour + Finales de conf + Finale NBA",
    opens:       "Première série du 2e tour connue",
    closes:      "Début du premier match du 2e tour",
    category:    "postseason",
  },
  POSTSEASON_PLAYOFFS_CF: {
    label:       "Playoffs — Finales de conférence",
    description: "Prédisez les 2 Finales de conférence + Finale NBA",
    opens:       "Première Finale de conférence connue",
    closes:      "Début du premier match de Finale de conférence",
    category:    "postseason",
  },
  POSTSEASON_PLAYOFFS_FINALS: {
    label:       "Finale NBA",
    description: "Désignez le champion, le W/L et le MVP des Finals",
    opens:       "Fin du dernier match de Finale de conférence",
    closes:      "Début du Game 1 des Finals",
    category:    "postseason",
  },
};

// ─── Barèmes ──────────────────────────────────────────────────────────────────

// Paris de début de saison — principes :
//   1. Plus c'est dur, plus ça rapporte (cote par rang, points doublés à chaque tour du bracket).
//   2. Être proche compte un peu (classement : 1 place d'écart).
//   3. Rien n'est payé deux fois (le bracket ne repaye pas le classement).
// Une très bonne série ≈ 2 400 pts (≈ 1/4 d'une saison de paris de match).

/** Trophées (MVP, DPOY, Rookie) : 200 pts pour le 1er du classement de référence, +50 par place, 1 000 max. */
export const TROPHY_POINTS = { FIRST: 200, STEP: 50, MAX: 1000 } as const;

/** Cote d'un joueur selon son rang (null = hors classement → cote maximale). */
export function trophyPoints(rank: number | null): number {
  if (rank == null || rank < 1) return TROPHY_POINTS.MAX;
  return Math.min(TROPHY_POINTS.MAX, TROPHY_POINTS.FIRST + (rank - 1) * TROPHY_POINTS.STEP);
}

/** Champion NBA Cup : 400 pts pour le meilleur bilan de la saison passée, +25 par place (1 125 pour le 30e). */
export const NBA_CUP_POINTS = { FIRST: 400, STEP: 25 } as const;

export function nbaCupChampionPoints(previousRank: number): number {
  return NBA_CUP_POINTS.FIRST + (Math.max(1, previousRank) - 1) * NBA_CUP_POINTS.STEP;
}

/** Classement NBA : points par équipe + bonus selon la part d'équipes à la place exacte. */
export const STANDINGS_POINTS = {
  EXACT:   50,   // place exacte
  ONE_OFF: 10,   // 1 place d'écart
  /** Seul le palier le plus haut atteint compte (part des 30 équipes à la place exacte). */
  BONUS: [
    { share: 0.5, teams: 15, points: 1000 },
    { share: 0.4, teams: 12, points: 500 },
    { share: 0.3, teams: 9,  points: 250 },
    { share: 0.2, teams: 6,  points: 100 },
  ],
} as const;

/**
 * Bracket : points par équipe qui passe le tour (même si l'adversaire n'est pas celui prévu),
 * doublés à chaque tour. Bonus « bon nombre de matchs » (+50 %) seulement si la série prévue
 * a eu lieu, avec le bon vainqueur. Les seeds 1 à 10 ne rapportent rien : c'est le pari Classement.
 */
export const PRESEASON_BRACKET_POINTS = {
  PLAYIN_TEAM: 50,    // équipe qualifiée en 7e ou 8e place via le Play-in
  R1:          50,    // gagne son 1er tour
  R2:          100,   // gagne sa demi-finale de conférence
  CF:          200,   // gagne sa finale de conférence
  CHAMPION:    400,   // championne NBA
  GAMES_BONUS: 0.5,   // +50 % si bon nombre de matchs
  FINALS_MVP:  200,
} as const;

/** Points d'un tour + bonus « bon nombre de matchs », pour l'affichage. */
export function bracketRoundLabel(points: number): string {
  return `${points} pts · +${Math.round(points * PRESEASON_BRACKET_POINTS.GAMES_BONUS)} si bon nombre de matchs`;
}

/** Play-in (postseason) */
export const PLAYIN_POINTS = {
  // Premier tour (7v8 et 9v10)
  GAME_WINNER_EXACT:     20,
  FIRST_ROUND_BOTH_EXACT: 50,   // Bonus si juste aux deux matchs du premier tour

  // Match décisif
  DECISIVE_WINNER_EXACT:  50,
  DECISIVE_BOTH_EXACT:    50,   // Bonus si juste aux deux matchs décisifs (Est + Ouest)
} as const;

/** Playoffs R1 (postseason) */
export const PLAYOFFS_R1_POINTS = {
  SERIES_WINNER:         50,
  SERIES_WL_BONUS:      100,
  ALL_R1_WINNERS_BONUS: 400,
  ALL_R1_WL_BONUS:     1200,
} as const;

/** Playoffs R2 (postseason) */
export const PLAYOFFS_R2_POINTS = {
  R2_SERIES_WINNER:         50,
  R2_SERIES_WL_BONUS:      100,
  ALL_R2_WINNERS_BONUS:    200,
  ALL_R2_WL_BONUS:         400,
  CF_SERIES_WINNER:        200,
  CF_SERIES_WL_BONUS:      200,
  ALL_CF_WINNERS_BONUS:    400,
  ALL_CF_WL_BONUS:         400,
  FINALS_CHAMPION:         500,
  FINALS_WL_BONUS:         300,
} as const;

/** Playoffs CF (postseason) */
export const PLAYOFFS_CF_POINTS = {
  CF_SERIES_WINNER:       50,
  CF_SERIES_WL_BONUS:    100,
  ALL_CF_WINNERS_BONUS:  100,
  ALL_CF_WL_BONUS:       200,
  FINALS_CHAMPION:       200,
  FINALS_WL_BONUS:       200,
} as const;

/** Playoffs Finals (postseason) */
export const PLAYOFFS_FINALS_POINTS = {
  CHAMPION:          100,
  WL_BONUS:          100,
  MVP_FINALS:         50,
  COMBO_ULTIME:      100,   // Champion + W/L + MVP tous corrects
} as const;

// ─── Points max théoriques ─────────────────────────────────────────────────────

export const MAX_POINTS = {
  PRESEASON_NBA_CUP_CHAMPION: 1125,   // pire bilan de la saison passée
  PRESEASON_MVP_SEASON:       1000,
  PRESEASON_DPOY:             1000,
  PRESEASON_ROOKIE:           1000,
  PRESEASON_NBA_STANDINGS:    2500,   // 30 × 50 + bonus 1 000
  PRESEASON_BRACKET:          2800,   // Play-in 200 + 4 tours × 600 + MVP des Finales 200
  POSTSEASON_PLAYIN:           330,   // 4×20 + 2×50 + 2×50 + 50
  POSTSEASON_PLAYOFFS_R1:     2800,   // 8×(50+100) + 400 + 1200
  POSTSEASON_PLAYOFFS_R2:     3600,   // R2 1 200 + CF 1 600 + Finale 800
  POSTSEASON_PLAYOFFS_CF:     1000,   // CF 600 + Finale 400
  POSTSEASON_PLAYOFFS_FINALS:  350,
} as const;

// ─── Structures JSON des données prédites ─────────────────────────────────────

export interface SeriesPrediction {
  team1Id:           string;
  team2Id:           string;
  predictedWinnerId: string;
  predictedGames:    4 | 5 | 6 | 7;
}

export interface PlayinPredictionData {
  east: {
    game_7v8:    { predictedWinnerId: string };
    game_9v10:   { predictedWinnerId: string };
    game_decisive: { predictedWinnerId: string };  // loser of 7v8 vs winner of 9v10
  };
  west: {
    game_7v8:    { predictedWinnerId: string };
    game_9v10:   { predictedWinnerId: string };
    game_decisive: { predictedWinnerId: string };
  };
}

export interface BracketConferencePrediction {
  seeds:      string[];  // 10 teamIds, positions 1–10
  playin:     { seed7: string; seed8: string };
  r1:         SeriesPrediction[];  // 4 séries
  r2:         SeriesPrediction[];  // 2 séries
  confFinals: SeriesPrediction;
  finalist:   string;
}

export interface PreseasonBracketData {
  east:      BracketConferencePrediction;
  west:      BracketConferencePrediction;
  finals:    SeriesPrediction;  // vainqueur = champion, predictedGames = W/L de la Finale
  champion:  string;            // = finals.predictedWinnerId
  mvpFinals: string;            // playerId (joueur d'un des deux finalistes)
}

export interface StandingsPredictionData {
  east: string[];  // 15 teamIds, rang 1→15
  west: string[];
}

export interface NbaCupChampionData { teamId: string }
/** MVP, DPOY et Rookie de l'année : un joueur. */
export interface PlayerPickData { playerId: string }
export type MvpSeasonData = PlayerPickData;

// ─── Paris de début de saison : date limite ───────────────────────────────────

export const PRESEASON_BET_TYPES = [
  "PRESEASON_NBA_CUP_CHAMPION",
  "PRESEASON_MVP_SEASON",
  "PRESEASON_DPOY",
  "PRESEASON_ROOKIE",
  "PRESEASON_NBA_STANDINGS",
  "PRESEASON_BRACKET",
] as const;
export type PreseasonBetType = typeof PRESEASON_BET_TYPES[number];

/** Paris « un joueur » et le trophée correspondant. */
export const PLAYER_AWARD_TYPES = ["PRESEASON_MVP_SEASON", "PRESEASON_DPOY", "PRESEASON_ROOKIE"] as const;
export type PlayerAwardType = typeof PLAYER_AWARD_TYPES[number];

/** Trophées dont le vainqueur est saisi dans l'admin (/admin/saison) pour noter les paris. */
export const AWARD_KEYS = ["MVP", "DPOY", "ROOKIE", "FINALS_MVP"] as const;
export type AwardKey = typeof AWARD_KEYS[number];

export const AWARD_LABELS: Record<AwardKey, string> = {
  MVP:        "MVP",
  DPOY:       "Défenseur de l'année",
  ROOKIE:     "Rookie de l'année",
  FINALS_MVP: "MVP des Finales",
};

/**
 * RÈGLE OFFICIELLE : les paris de début de saison ferment au coup d'envoi du premier
 * match de saison régulière (calculé par getPreseasonDeadline côté serveur).
 *
 * PRESEASON_DEADLINES ne sert qu'aux EXCEPTIONS ponctuelles. Ne rien ajouter ici
 * pour une saison normale.
 *
 * Exception 2026-27 : lancement de la bêta en cours de saison (saison démarrée le 20/10)
 * → tous les paris, NBA Cup comprise, ferment le dimanche 15 novembre à 23h59 (Paris)
 *   (repoussé du 3 au 10, puis au 15 novembre avec l'ajout du DPOY et du Rookie de l'année).
 */
export const PRESEASON_DEADLINES: Record<string, string> = {
  "2026-27": "2026-11-15T23:59:00+01:00", // exception lancement bêta
};
