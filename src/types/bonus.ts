/**
 * Types et utilitaires pour le système de points bonus
 */

// ============================================
// ENUMS
// ============================================

export enum ScoreMarginCategory {
  OVERTIME = "OVERTIME",
  SERRE = "SERRE",
  CLASSIQUE = "CLASSIQUE",
  FACILE = "FACILE",
  LARGE = "LARGE",
  BLOWOUT = "BLOWOUT",
}

// ============================================
// LABELS & DESCRIPTIONS
// ============================================

export const SCORE_MARGIN_LABELS: Record<ScoreMarginCategory, string> = {
  [ScoreMarginCategory.OVERTIME]: "Après prolongation",
  [ScoreMarginCategory.SERRE]: "Match serré (1-5 pts)",
  [ScoreMarginCategory.CLASSIQUE]: "Un classique (6-10 pts)",
  [ScoreMarginCategory.FACILE]: "Match easy (11-15 pts)",
  [ScoreMarginCategory.LARGE]: "Large victoire (16-20 pts)",
  [ScoreMarginCategory.BLOWOUT]: "Blow out (21+ pts)",
};

export const SCORE_MARGIN_DESCRIPTIONS: Record<ScoreMarginCategory, string> = {
  [ScoreMarginCategory.OVERTIME]: "Match décidé en prolongation",
  [ScoreMarginCategory.SERRE]: "Victoire serrée de 1 à 5 points",
  [ScoreMarginCategory.CLASSIQUE]: "Victoire classique de 6 à 10 points",
  [ScoreMarginCategory.FACILE]: "Victoire confortable de 11 à 15 points",
  [ScoreMarginCategory.LARGE]: "Large victoire de 16 à 20 points",
  [ScoreMarginCategory.BLOWOUT]: "Domination totale, 21 points ou plus",
};

export const SCORE_MARGIN_ICONS: Record<ScoreMarginCategory, string> = {
  [ScoreMarginCategory.OVERTIME]: "⏱️",
  [ScoreMarginCategory.SERRE]: "🔥",
  [ScoreMarginCategory.CLASSIQUE]: "⚖️",
  [ScoreMarginCategory.FACILE]: "💪",
  [ScoreMarginCategory.LARGE]: "🚀",
  [ScoreMarginCategory.BLOWOUT]: "💥",
};

// ============================================
// BARÈME DE POINTS
// ============================================

export const BONUS_POINTS = {
  BASE: 10,                // Points de base pour un prono correct
  MARGIN_EXACT: 10,        // Bonus si catégorie d'écart exacte (toutes catégories)
  TOP_SCORER_BASE: 40,     // Base pour calculer la cote du top scorer (40 - moyenne)
  COMBO_PERFECT: 20,       // Bonus si prono + écart + top scorer tous corrects
} as const;

// Max théorique = 10 (base) + 10 (écart) + 40 (top scorer rookie) + 20 (combo) = 80 pts
export const MAX_POINTS_POSSIBLE = 80;

// ============================================
// UTILITAIRES
// ============================================

/**
 * Calcule la catégorie d'écart à partir du score final
 */
export function getScoreMarginCategory(
  homeScore: number,
  awayScore: number,
  hasOvertime: boolean
): ScoreMarginCategory {
  // Si prolongation, c'est automatiquement OVERTIME
  if (hasOvertime) {
    return ScoreMarginCategory.OVERTIME;
  }

  const margin = Math.abs(homeScore - awayScore);

  if (margin >= 1 && margin <= 5) return ScoreMarginCategory.SERRE;
  if (margin >= 6 && margin <= 10) return ScoreMarginCategory.CLASSIQUE;
  if (margin >= 11 && margin <= 15) return ScoreMarginCategory.FACILE;
  if (margin >= 16 && margin <= 20) return ScoreMarginCategory.LARGE;
  return ScoreMarginCategory.BLOWOUT; // 21+
}

/**
 * Calcule le bonus de points pour l'écart
 */
export function calculateMarginBonus(
  predicted: ScoreMarginCategory | null,
  actual: ScoreMarginCategory
): number {
  if (!predicted) return 0;
  if (predicted === actual) return BONUS_POINTS.MARGIN_EXACT;
  return 0;
}

/**
 * Calcule la cote (points) pour un joueur en fonction de sa moyenne
 * Formule : 40 - moyenne, arrondi au chiffre rond le plus proche
 *
 * @param playerAverage - Moyenne de points par match du joueur (0 si rookie/inconnu)
 * @returns La cote en points (entre 0 et 40)
 */
export function calculateTopScorerOdds(playerAverage: number): number {
  // Si pas de moyenne (rookie, nouveau), la cote est maximale
  if (!playerAverage || playerAverage <= 0) {
    return BONUS_POINTS.TOP_SCORER_BASE; // 40 pts
  }

  // Calcul : 40 - moyenne, arrondi au chiffre rond le plus proche
  const rawOdds = BONUS_POINTS.TOP_SCORER_BASE - playerAverage;

  // Minimum 0 (si un joueur a plus de 40 de moyenne, ce qui est quasi impossible)
  const odds = Math.max(0, Math.round(rawOdds));

  return odds;
}

/**
 * Calcule le bonus de points pour le top scorer
 * IMPORTANT: Ce bonus est INDÉPENDANT du résultat du prono
 *
 * @param predictedPlayerId - ID du joueur prédit
 * @param actualTopScorerId - ID du vrai top scorer du match
 * @param playerAverage - Moyenne de points du joueur prédit (pour calculer la cote)
 */
export function calculateTopScorerBonus(
  predictedPlayerId: string | null,
  actualTopScorerId: string | null,
  playerAverage: number = 0
): number {
  if (!predictedPlayerId || !actualTopScorerId) return 0;
  if (predictedPlayerId === actualTopScorerId) {
    return calculateTopScorerOdds(playerAverage);
  }
  return 0;
}

/**
 * Calcule le bonus combo (prono + écart + top scorer tous corrects)
 */
export function calculateComboBonus(
  predictionWon: boolean,
  marginCorrect: boolean,
  topScorerCorrect: boolean
): number {
  // Combo parfait = prono gagnant + écart exact + top scorer exact
  const hasAllBonuses = predictionWon && marginCorrect && topScorerCorrect;

  return hasAllBonuses ? BONUS_POINTS.COMBO_PERFECT : 0;
}

/**
 * Calcule tous les points d'un prono (base + bonus)
 *
 * Règles :
 * - Bonne équipe : 10 pts (BASE)
 * - Bon écart : 10 pts (seulement si bonne équipe)
 * - Bon top scorer : 40 - moyenne du joueur (INDÉPENDANT du prono)
 * - Combo parfait : 20 pts (si les 3 sont corrects)
 */
export function calculateTotalPoints(params: {
  predictionWon: boolean;
  predictedMargin: ScoreMarginCategory | null;
  actualMargin: ScoreMarginCategory | null;
  predictedTopScorerId: string | null;
  actualTopScorerId: string | null;
  predictedTopScorerAverage?: number; // Moyenne du joueur prédit pour calculer la cote
}): {
  basePoints: number;
  marginBonus: number;
  topScorerBonus: number;
  comboBonus: number;
  total: number;
} {
  const {
    predictionWon,
    predictedMargin,
    actualMargin,
    predictedTopScorerId,
    actualTopScorerId,
    predictedTopScorerAverage = 0,
  } = params;

  // Points de base (bonne équipe)
  const basePoints = predictionWon ? BONUS_POINTS.BASE : 0;

  // Bonus écart (seulement si prono gagnant)
  const marginCorrect = predictionWon && actualMargin
    ? predictedMargin === actualMargin
    : false;
  const marginBonus = marginCorrect ? BONUS_POINTS.MARGIN_EXACT : 0;

  // Bonus top scorer (INDÉPENDANT du résultat du prono !)
  const topScorerCorrect = predictedTopScorerId && actualTopScorerId
    ? predictedTopScorerId === actualTopScorerId
    : false;
  const topScorerBonus = topScorerCorrect
    ? calculateTopScorerOdds(predictedTopScorerAverage)
    : 0;

  // Bonus combo (seulement si tout est correct)
  const comboBonus = calculateComboBonus(predictionWon, marginCorrect, topScorerCorrect);

  return {
    basePoints,
    marginBonus,
    topScorerBonus,
    comboBonus,
    total: basePoints + marginBonus + topScorerBonus + comboBonus,
  };
}

// ============================================
// TYPES
// ============================================

export interface BonusBreakdown {
  basePoints: number;
  marginBonus: number;
  topScorerBonus: number;
  comboBonus: number;
  total: number;
}

export interface PredictionWithBonus {
  id: string;
  predictedTeamId: string;
  predictedScoreMargin?: ScoreMarginCategory | null;
  predictedTopScorerId?: string | null;
  result: "PENDING" | "WON" | "LOST";
  pointsEarned: number;
  marginBonusPoints: number;
  topScorerBonusPoints: number;
  comboBonusPoints: number;
}
