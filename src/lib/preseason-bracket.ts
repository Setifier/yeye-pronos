/**
 * Bracket de début de saison — logique pure (client + serveur, sans base de données).
 *
 * Seeds 1-10 de chaque conférence = top 10 du classement prédit par le joueur.
 * Play-in : parmi les seeds 7 à 10, le joueur désigne qui finit 7e et 8e.
 * 1er tour (ordre haut → bas) : 1v8 · 4v5 · 3v6 · 2v7, puis 2e tour, finale de conf, Finale NBA.
 * Chaque série : vainqueur + nombre de matchs (4 à 7).
 *
 * `resolveBracket` recalcule les affiches à partir des choix et supprime ceux devenus
 * impossibles (ex. on change un vainqueur du 1er tour → la suite qui en dépendait est effacée).
 */

import type {
  BracketConferencePrediction,
  PreseasonBracketData,
  SeriesPrediction,
} from "@/types/special-predictions";

export type SeriesGames = 4 | 5 | 6 | 7;
export const SERIES_GAMES: SeriesGames[] = [4, 5, 6, 7];

/** games = null : vainqueur choisi mais nombre de matchs pas encore indiqué (le vainqueur passe quand même au tour suivant). */
export interface SeriesPick { winnerId: string; games: SeriesGames | null }

export interface ConfPicks {
  seed7: string | null;
  seed8: string | null;
  r1: (SeriesPick | null)[]; // 4 : 1v8, 4v5, 3v6, 2v7
  r2: (SeriesPick | null)[]; // 2 : haut, bas
  cf: SeriesPick | null;
}

export interface BracketPicks {
  east: ConfPicks;
  west: ConfPicks;
  finals: SeriesPick | null;
  mvpFinals: string | null;
}

export interface Matchup {
  team1: string | null; // meilleure seed
  team2: string | null;
  pick: SeriesPick | null;
}

export interface ResolvedConference {
  seeds: string[];
  playinTeams: string[]; // seeds 7 à 10
  seed7: string | null;
  seed8: string | null;
  r1: Matchup[];
  r2: Matchup[];
  cf: Matchup;
  finalist: string | null;
  picks: ConfPicks;
}

export interface ResolvedBracket {
  east: ResolvedConference;
  west: ResolvedConference;
  finals: Matchup;
  champion: string | null;
  mvpFinals: string | null;
  picks: BracketPicks;
  /** nombre de choix faits / à faire (play-in compté 2 par conf) */
  progress: { done: number; total: number };
  complete: boolean;
}

export const emptyConfPicks = (): ConfPicks => ({ seed7: null, seed8: null, r1: [null, null, null, null], r2: [null, null], cf: null });
export const emptyBracketPicks = (): BracketPicks => ({ east: emptyConfPicks(), west: emptyConfPicks(), finals: null, mvpFinals: null });

function validPick(team1: string | null, team2: string | null, pick: SeriesPick | null | undefined): SeriesPick | null {
  if (!pick || !team1 || !team2) return null;
  if (pick.winnerId !== team1 && pick.winnerId !== team2) return null;
  const games = pick.games && SERIES_GAMES.includes(pick.games) ? pick.games : null;
  return { winnerId: pick.winnerId, games };
}

/** Choix complet = vainqueur + nombre de matchs. */
const full = (m: Matchup) => !!m.pick && m.pick.games !== null;

export function resolveConference(seeds: string[], picks: ConfPicks): ResolvedConference {
  const s = (n: number) => seeds[n - 1] ?? null;
  const playinTeams = seeds.slice(6, 10);
  const seed7 = picks.seed7 && playinTeams.includes(picks.seed7) ? picks.seed7 : null;
  const seed8 = picks.seed8 && playinTeams.includes(picks.seed8) && picks.seed8 !== seed7 ? picks.seed8 : null;

  // Seed de playoffs de chaque équipe (pour mettre la meilleure en haut)
  const playoffSeed = new Map<string, number>();
  for (let i = 1; i <= 6; i++) { const t = s(i); if (t) playoffSeed.set(t, i); }
  if (seed7) playoffSeed.set(seed7, 7);
  if (seed8) playoffSeed.set(seed8, 8);
  const ordered = (a: string | null, b: string | null): [string | null, string | null] =>
    a && b && (playoffSeed.get(a) ?? 99) > (playoffSeed.get(b) ?? 99) ? [b, a] : [a, b];

  const make = (a: string | null, b: string | null, pick: SeriesPick | null | undefined): Matchup => {
    const [team1, team2] = ordered(a, b);
    return { team1, team2, pick: validPick(team1, team2, pick) };
  };
  const winner = (m: Matchup) => m.pick?.winnerId ?? null;

  const r1 = [
    make(s(1), seed8, picks.r1[0]),
    make(s(4), s(5), picks.r1[1]),
    make(s(3), s(6), picks.r1[2]),
    make(s(2), seed7, picks.r1[3]),
  ];
  const r2 = [
    make(winner(r1[0]), winner(r1[1]), picks.r2[0]),
    make(winner(r1[2]), winner(r1[3]), picks.r2[1]),
  ];
  const cf = make(winner(r2[0]), winner(r2[1]), picks.cf);

  return {
    seeds,
    playinTeams,
    seed7,
    seed8,
    r1,
    r2,
    cf,
    finalist: winner(cf),
    picks: { seed7, seed8, r1: r1.map((m) => m.pick), r2: r2.map((m) => m.pick), cf: cf.pick },
  };
}

export function resolveBracket(seedsEast: string[], seedsWest: string[], picks: BracketPicks): ResolvedBracket {
  const east = resolveConference(seedsEast, picks.east);
  const west = resolveConference(seedsWest, picks.west);
  const finals: Matchup = {
    team1: east.finalist,
    team2: west.finalist,
    pick: validPick(east.finalist, west.finalist, picks.finals),
  };
  const champion = finals.pick?.winnerId ?? null;
  const mvpFinals = finals.team1 && finals.team2 ? picks.mvpFinals : null;

  const confDone = (c: ResolvedConference) =>
    (c.seed7 ? 1 : 0) + (c.seed8 ? 1 : 0) + c.r1.filter(full).length + c.r2.filter(full).length + (full(c.cf) ? 1 : 0);
  const done = confDone(east) + confDone(west) + (full(finals) ? 1 : 0) + (mvpFinals ? 1 : 0);
  const total = 2 * (2 + 4 + 2 + 1) + 1 + 1; // 20

  return {
    east,
    west,
    finals,
    champion,
    mvpFinals,
    picks: { east: east.picks, west: west.picks, finals: finals.pick, mvpFinals },
    progress: { done, total },
    complete: done === total,
  };
}

// ─── Conversion vers / depuis le format stocké (SpecialPrediction.data) ──────

const toSeries = (m: Matchup): SeriesPrediction => ({
  team1Id: m.team1!,
  team2Id: m.team2!,
  predictedWinnerId: m.pick!.winnerId,
  predictedGames: m.pick!.games as SeriesGames, // bracket complet : games toujours renseigné
});

function confToData(c: ResolvedConference): BracketConferencePrediction {
  return {
    seeds: c.seeds.slice(0, 10),
    playin: { seed7: c.seed7!, seed8: c.seed8! },
    r1: c.r1.map(toSeries),
    r2: c.r2.map(toSeries),
    confFinals: toSeries(c.cf),
    finalist: c.finalist!,
  };
}

/** Bracket complet → format stocké. null si incomplet. */
export function bracketToData(b: ResolvedBracket): PreseasonBracketData | null {
  if (!b.complete || !b.champion || !b.mvpFinals) return null;
  return {
    east: confToData(b.east),
    west: confToData(b.west),
    finals: toSeries(b.finals),
    champion: b.champion,
    mvpFinals: b.mvpFinals,
  };
}

/** Format stocké → seeds + choix (pour réafficher / revalider). */
export function dataToBracket(data: Partial<PreseasonBracketData> | null | undefined): {
  seedsEast: string[]; seedsWest: string[]; picks: BracketPicks;
} {
  const conf = (c?: Partial<BracketConferencePrediction>): ConfPicks => ({
    seed7: c?.playin?.seed7 ?? null,
    seed8: c?.playin?.seed8 ?? null,
    r1: [0, 1, 2, 3].map((i) => toPick(c?.r1?.[i])),
    r2: [0, 1].map((i) => toPick(c?.r2?.[i])),
    cf: toPick(c?.confFinals),
  });
  return {
    seedsEast: data?.east?.seeds ?? [],
    seedsWest: data?.west?.seeds ?? [],
    picks: {
      east: conf(data?.east),
      west: conf(data?.west),
      finals: toPick(data?.finals),
      mvpFinals: data?.mvpFinals ?? null,
    },
  };
}

/**
 * JSON à clés triées : PostgreSQL (jsonb) réordonne les clés à l'enregistrement,
 * une comparaison JSON.stringify directe verrait toujours une différence.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function toPick(s?: Partial<SeriesPrediction>): SeriesPick | null {
  if (!s?.predictedWinnerId || !s.predictedGames) return null;
  return { winnerId: s.predictedWinnerId, games: s.predictedGames as SeriesGames };
}
