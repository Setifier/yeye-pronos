/**
 * Format commun d'un match côté interface de pari (accueil, page Matchs).
 * Produit par `src/lib/bet-games.ts`, consommé par `src/components/bets/*`.
 */

export type BetGameStatus = "SCHEDULED" | "LIVE" | "FINAL" | "POSTPONED" | "CANCELLED";
export type BetResult = "PENDING" | "WON" | "LOST" | "CANCELLED";

export interface BetTeam {
  id:           string;
  abbreviation: string;
  name:         string;
  city:         string;
  record:       string | null; // "5-2" (saison régulière)
}

export interface BetPrediction {
  predictedTeamId:      string;
  predictedScoreMargin: string | null;
  predictedTopScorer:   { id: string; fullName: string; headshot: string | null } | null;
  result:               BetResult;
  pointsEarned:         number;
  marginBonusPoints:    number;
  topScorerBonusPoints: number;
  comboBonusPoints:     number;
}

export interface BetGame {
  id:                 string;
  nightDate:          string; // date US Eastern YYYY-MM-DD
  gameDate:           string; // ISO UTC
  predictionDeadline: string; // ISO UTC
  status:             BetGameStatus;
  homeTeam:           BetTeam;
  awayTeam:           BetTeam;
  homeScore:          number | null;
  awayScore:          number | null;
  currentPeriod:      number | null;
  gameClock:          string | null;
  seasonType:         string;
  nbaCupRound:        string | null;
  isIfNecessary:      boolean;
  gameNumber:         number | null;
  scoreMarginCategory: string | null;
  topScorer:          { fullName: string; points: number | null } | null;
  prediction:         BetPrediction | null;
}

// ─── Heure limite des pronos match ───────────────────────────────────────────

/** Les pronos d'un match ferment au coup d'envoi (0 min avant). */
export const PREDICTION_DEADLINE_MINUTES = 0;

/**
 * Heure limite d'un prono, calculée depuis l'heure du match (source de vérité).
 * Le champ Game.predictionDeadline est tenu à jour par la synchro, mais l'app
 * recalcule toujours depuis gameDate : un changement de règle ou d'horaire ESPN
 * s'applique immédiatement, sans resynchroniser la base.
 */
export function predictionDeadlineFor(gameDate: Date | string): Date {
  return new Date(new Date(gameDate).getTime() - PREDICTION_DEADLINE_MINUTES * 60_000);
}

/** On peut encore parier : match programmé, pas "if necessary", deadline non passée. */
export function isBettable(game: BetGame, now: number = Date.now()): boolean {
  return (
    game.status === "SCHEDULED" &&
    !game.isIfNecessary &&
    new Date(game.predictionDeadline).getTime() > now
  );
}

/** Paris manquants = matchs encore ouverts sans prono. */
export function missingBets(games: BetGame[], now: number = Date.now()): BetGame[] {
  return games.filter((g) => isBettable(g, now) && !g.prediction);
}

// ─── Catégories d'écart (identiques à src/types/bonus.ts) ─────────────────────

export const MARGIN_OPTIONS = [
  { key: "SERRE",     short: "1-5",   label: "Serré" },
  { key: "CLASSIQUE", short: "6-10",  label: "Classique" },
  { key: "FACILE",    short: "11-15", label: "Facile" },
  { key: "LARGE",     short: "16-20", label: "Large" },
  { key: "BLOWOUT",   short: "21+",   label: "Blowout" },
  { key: "OVERTIME",  short: "OT",    label: "Prolongation" },
] as const;

export function marginLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  const m = MARGIN_OPTIONS.find((o) => o.key === key);
  return m ? (m.key === "OVERTIME" ? "Prolongation" : `${m.short} pts`) : key;
}
