/**
 * Types, constantes et barèmes pour les paris spéciaux (hors matchs individuels).
 */

// ─── Identifiants des types de paris ──────────────────────────────────────────

export const SPECIAL_PRED_TYPES = {
  // Présaison
  PRESEASON_NBA_CUP_CHAMPION: "PRESEASON_NBA_CUP_CHAMPION",
  PRESEASON_MVP_SEASON:        "PRESEASON_MVP_SEASON",
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

/** Champion NBA Cup — cotes basées sur le classement wild card de la saison précédente */
export function nbaCupChampionPoints(wildCardRank: number): number {
  // #1 → 500pts, chaque place suivante +50pts → #30 → 1950pts
  return 500 + (wildCardRank - 1) * 50;
}

/** MVP Saison — cotes basées sur le classement MVP de la saison précédente */
export const MVP_SEASON_DEFAULT_POINTS = 2000;

/** Classement NBA */
export const STANDINGS_POINTS = {
  PER_TEAM_CORRECT: 100,    // 100 pts par équipe à la bonne place (max 3000)
  COMBO_ULTIME:     2000,   // Bonus si toutes les équipes sont exactes
} as const;

/** Champion NBA — cotes basées sur les résultats playoffs précédents */
export const NBA_CHAMPION_POINTS_BY_LAST_SEASON: Record<string, number> = {
  // Ces valeurs sont chargées depuis SpecialPredictionConfig en DB
  // Valeurs par défaut (overridées par la config de la saison)
  CHAMPION:          500,
  RUNNER_UP:         750,
  CONF_FINALS_LOSER: 1000,
  R2_LOSER:          1250,
  R1_LOSER:          1500,
  PLAYIN_DECISIVE_LOSER: 1750,
  PLAYIN_9V10_LOSER: 2000,
  NON_PLAYOFF:       5000,
};

/** Bracket Présaison */
export const PRESEASON_BRACKET_POINTS = {
  // Seeds Play-in (positions 1-10 par conf)
  PER_SEED_CORRECT:    50,    // 50pts par seed exact
  SEED_COMBO_ULTIME:  1000,   // Bonus si les 10 seeds d'une conf sont exacts (×2 conf)

  // Séries
  R1_WINNER:          500,
  R1_WINNER_AND_WL:   500,    // +500 si bonne équipe ET bon W/L
  R2_WINNER:         1000,
  R2_WINNER_AND_WL:  1000,
  CF_WINNER:         1500,
  CF_WINNER_AND_WL:  1500,
  FINALS_CHAMPION:   2000,
  FINALS_WL:         2000,
  FINALS_MVP:        1000,
} as const;

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
  PRESEASON_NBA_CUP_CHAMPION: 5000,
  PRESEASON_MVP_SEASON:       2000,
  PRESEASON_NBA_STANDINGS:    5000,   // 3000 + 2000 combo
  PRESEASON_BRACKET:         30000,   // Sum de tous les barèmes bracket présaison (estimé)
  POSTSEASON_PLAYIN:           240,
  POSTSEASON_PLAYOFFS_R1:     3200,   // 8×(50+100) + 400 + 1200
  POSTSEASON_PLAYOFFS_R2:     4100,   // R2+CF+Finals + bonus
  POSTSEASON_PLAYOFFS_CF:     1200,   // CF+Finals + bonus
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
export interface MvpSeasonData { playerId: string }

// ─── Paris de début de saison : date limite ───────────────────────────────────

export const PRESEASON_BET_TYPES = [
  "PRESEASON_NBA_CUP_CHAMPION",
  "PRESEASON_MVP_SEASON",
  "PRESEASON_NBA_STANDINGS",
  "PRESEASON_BRACKET",
] as const;
export type PreseasonBetType = typeof PRESEASON_BET_TYPES[number];

/**
 * RÈGLE OFFICIELLE : les paris de début de saison ferment au coup d'envoi du premier
 * match de saison régulière (calculé par getPreseasonDeadline côté serveur).
 *
 * PRESEASON_DEADLINES ne sert qu'aux EXCEPTIONS ponctuelles. Ne rien ajouter ici
 * pour une saison normale.
 *
 * Exception 2026-27 : lancement de la bêta en cours de saison (saison démarrée le 20/10)
 * → tous les paris, NBA Cup comprise, ferment le mardi 10 novembre à 23h59 (Paris)
 *   (repoussé du 3 au 10 novembre pour laisser le temps aux testeurs de la bêta).
 */
export const PRESEASON_DEADLINES: Record<string, string> = {
  "2026-27": "2026-11-10T23:59:00+01:00", // exception lancement bêta
};
