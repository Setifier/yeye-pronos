/**
 * Paris de début de saison — logique serveur.
 *
 *   - date limite (src/types/special-predictions.ts → PRESEASON_DEADLINES)
 *   - équipes + bilan de la saison précédente (préremplissage du classement, cotes NBA Cup)
 *   - cotes NBA Cup : SpecialPredictionConfig si renseigné, sinon rang de la saison précédente
 *     (meilleure équipe = 500 pts … pire = 1 950 pts, cf. nbaCupChampionPoints)
 *   - validation des données envoyées par l'utilisateur
 */

import type { PrismaClient } from "@/generated/prisma";
import {
  PRESEASON_DEADLINES,
  PRESEASON_BET_TYPES,
  MVP_SEASON_DEFAULT_POINTS,
  nbaCupChampionPoints,
  type PreseasonBetType,
  type PreseasonBracketData,
  type StandingsPredictionData,
} from "@/types/special-predictions";
import { getPreviousSeason, getSeasonStartYear } from "@/types/season";
import { bracketToData, dataToBracket, resolveBracket } from "@/lib/preseason-bracket";

export interface SeasonTeam {
  id: string;
  abbreviation: string;
  name: string;
  city: string;
  conference: "EAST" | "WEST";
  division: string;
  previousRecord: string | null; // bilan saison précédente "52-30"
  previousRank: number | null;   // rang ligue saison précédente (1 = meilleur bilan)
  nbaCupGroup: string | null;    // "East-A"…
}

/**
 * Règle : coup d'envoi du premier match de saison régulière.
 * Seule exception possible : une date déclarée dans PRESEASON_DEADLINES (ex. lancement bêta 2026-27).
 */
export async function getPreseasonDeadline(prisma: PrismaClient, season: string): Promise<Date> {
  const exception = PRESEASON_DEADLINES[season];
  if (exception) return new Date(exception);
  const first = await prisma.game.findFirst({
    where: { season, seasonType: "Regular Season" },
    orderBy: { gameDate: "asc" },
    select: { gameDate: true },
  });
  return first?.gameDate ?? new Date(`${getSeasonStartYear(season)}-10-20T23:00:00Z`);
}

export function isPreseasonType(type: string): type is PreseasonBetType {
  return (PRESEASON_BET_TYPES as readonly string[]).includes(type);
}

export async function loadSeasonTeams(prisma: PrismaClient, season: string): Promise<SeasonTeam[]> {
  const previous = getPreviousSeason(season);
  const [teams, prevStats, cupGames] = await Promise.all([
    prisma.team.findMany({ select: { id: true, abbreviation: true, name: true, city: true, conference: true, division: true } }),
    prisma.teamSeasonStats.findMany({ where: { season: previous }, select: { teamId: true, wins: true, losses: true, winPct: true } }),
    prisma.game.findMany({ where: { season, nbaCupRound: "GroupPlay", nbaCupGroup: { not: null } }, select: { homeTeamId: true, awayTeamId: true, nbaCupGroup: true } }),
  ]);

  const ranked = [...prevStats].sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  const rankOf = new Map(ranked.map((s, i) => [s.teamId, i + 1]));
  const recordOf = new Map(prevStats.map((s) => [s.teamId, `${s.wins}-${s.losses}`]));
  const groupOf = new Map<string, string>();
  for (const g of cupGames) {
    groupOf.set(g.homeTeamId, g.nbaCupGroup!);
    groupOf.set(g.awayTeamId, g.nbaCupGroup!);
  }

  return teams
    .map((t) => ({
      ...t,
      previousRecord: recordOf.get(t.id) ?? null,
      previousRank: rankOf.get(t.id) ?? null,
      nbaCupGroup: groupOf.get(t.id) ?? null,
    }))
    .sort((a, b) => (a.previousRank ?? 99) - (b.previousRank ?? 99) || a.abbreviation.localeCompare(b.abbreviation));
}

/** Cotes du pari Champion NBA Cup : teamId → points. */
export async function getNbaCupOdds(prisma: PrismaClient, season: string, teams: SeasonTeam[]): Promise<Map<string, number>> {
  const configs = await prisma.specialPredictionConfig.findMany({
    where: { season, type: "NBA_CUP_CHAMPION" },
    select: { entityId: true, points: true },
  });
  if (configs.length > 0) return new Map(configs.map((c) => [c.entityId, c.points]));
  return new Map(teams.map((t) => [t.id, nbaCupChampionPoints(t.previousRank ?? 15)]));
}

export const MVP_POINTS = MVP_SEASON_DEFAULT_POINTS;

/** Classement par défaut : ordre de la saison précédente, par conférence. */
export function defaultStandings(teams: SeasonTeam[]): StandingsPredictionData {
  const conf = (c: "EAST" | "WEST") => teams.filter((t) => t.conference === c).map((t) => t.id); // déjà triées par rang
  return { east: conf("EAST"), west: conf("WEST") };
}

// ─── Validation ──────────────────────────────────────────────────────────────

type Result = { ok: true; data: unknown } | { ok: false; error: string };

export async function validatePreseasonData(
  prisma: PrismaClient,
  type: PreseasonBetType,
  data: unknown,
  teams: SeasonTeam[]
): Promise<Result> {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const d = (data ?? {}) as Record<string, unknown>;

  if (type === "PRESEASON_NBA_CUP_CHAMPION") {
    const teamId = String(d.teamId ?? "");
    if (!teamById.has(teamId)) return { ok: false, error: "Équipe inconnue" };
    return { ok: true, data: { teamId } };
  }

  if (type === "PRESEASON_MVP_SEASON") {
    const playerId = String(d.playerId ?? "");
    const player = await prisma.player.findUnique({ where: { id: playerId }, select: { teamId: true } });
    if (!player?.teamId) return { ok: false, error: "Joueur introuvable ou sans équipe" };
    return { ok: true, data: { playerId } };
  }

  if (type === "PRESEASON_NBA_STANDINGS") {
    const check = (list: unknown, conf: "EAST" | "WEST") => {
      const expected = teams.filter((t) => t.conference === conf).map((t) => t.id).sort();
      if (!Array.isArray(list) || list.length !== 15) return null;
      const ids = list.map(String);
      return [...ids].sort().join() === expected.join() ? ids : null;
    };
    const east = check(d.east, "EAST");
    const west = check(d.west, "WEST");
    if (!east || !west) return { ok: false, error: "Le classement doit contenir les 15 équipes de chaque conférence, une seule fois" };
    return { ok: true, data: { east, west } };
  }

  // PRESEASON_BRACKET : on reconstruit le bracket à partir des choix et on stocke la version canonique
  const parsed = dataToBracket(d as Partial<PreseasonBracketData>);
  const confOk = (seeds: string[], conf: "EAST" | "WEST") =>
    seeds.length === 10 && new Set(seeds).size === 10 && seeds.every((id) => teamById.get(id)?.conference === conf);
  if (!confOk(parsed.seedsEast, "EAST") || !confOk(parsed.seedsWest, "WEST")) {
    return { ok: false, error: "Seeds invalides : 10 équipes par conférence, issues de ton classement" };
  }
  const resolved = resolveBracket(parsed.seedsEast, parsed.seedsWest, parsed.picks);
  const canonical = bracketToData(resolved);
  if (!canonical) return { ok: false, error: `Bracket incomplet (${resolved.progress.done}/${resolved.progress.total} choix)` };

  const mvp = await prisma.player.findUnique({ where: { id: canonical.mvpFinals }, select: { teamId: true } });
  if (!mvp?.teamId || (mvp.teamId !== canonical.finals.team1Id && mvp.teamId !== canonical.finals.team2Id)) {
    return { ok: false, error: "Le MVP des Finales doit jouer dans une des deux équipes finalistes" };
  }
  return { ok: true, data: canonical };
}
