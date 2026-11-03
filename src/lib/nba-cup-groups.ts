/**
 * Groupes de la NBA Cup, déduits des 60 matchs de poule (ESPN ne donne pas le nom du groupe) :
 * les 5 équipes d'un groupe ne jouent qu'entre elles → composantes connexes, par conférence.
 *
 * ⚠️ Les lettres A/B/C suivent l'ordre alphabétique de la première abréviation du groupe :
 *    elles peuvent différer des lettres officielles NBA.
 *
 * Utilisé par le pipeline quotidien (automatique dès que le calendrier est importé)
 * et par `npm run db:backfill-nba-cup`.
 */

import type { PrismaClient } from "@/generated/prisma";

type Logger = (m: string) => void;

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  groups(): string[][] {
    const g = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!g.has(root)) g.set(root, []);
      g.get(root)!.push(id);
    }
    return [...g.values()];
  }
}

export interface NbaCupGroupsResult {
  /** Matchs de poule en base (60 attendus) */
  games: number;
  /** 60 matchs et 3 groupes de 5 équipes par conférence */
  complete: boolean;
  /** "East-A" → ["ATL", "BOS", …] */
  groups: Record<string, string[]>;
  /** Matchs dont le groupe a été écrit */
  updated: number;
}

/**
 * Calcule les groupes et les enregistre sur les matchs de poule.
 * N'écrit rien si le calendrier est incomplet (groupes non fiables) ou en dryRun.
 */
export async function inferNbaCupGroups(
  prisma: PrismaClient,
  season: string,
  opts: { dryRun?: boolean } = {}
): Promise<NbaCupGroupsResult> {
  const games = await prisma.game.findMany({
    where:  { season, nbaCupRound: "GroupPlay" },
    select: {
      id: true,
      nbaCupGroup: true,
      homeTeam: { select: { id: true, abbreviation: true, conference: true } },
      awayTeam: { select: { id: true, abbreviation: true } },
    },
  });
  const result: NbaCupGroupsResult = { games: games.length, complete: false, groups: {}, updated: 0 };
  if (games.length === 0) return result;

  const abbr = new Map<string, string>();
  const uf = { EAST: new UnionFind(), WEST: new UnionFind() };
  for (const g of games) {
    abbr.set(g.homeTeam.id, g.homeTeam.abbreviation);
    abbr.set(g.awayTeam.id, g.awayTeam.abbreviation);
    uf[g.homeTeam.conference].union(g.homeTeam.id, g.awayTeam.id);
  }

  const teamToGroup = new Map<string, string>();
  let shapeOk = true;
  for (const conf of ["EAST", "WEST"] as const) {
    const label = conf === "EAST" ? "East" : "West";
    const comps = uf[conf].groups()
      .map((ids) => ids.sort((a, b) => abbr.get(a)!.localeCompare(abbr.get(b)!)))
      .sort((a, b) => abbr.get(a[0])!.localeCompare(abbr.get(b[0])!));
    if (comps.length !== 3 || comps.some((c) => c.length !== 5)) shapeOk = false;
    comps.forEach((ids, i) => {
      const key = `${label}-${String.fromCharCode(65 + i)}`;
      result.groups[key] = ids.map((id) => abbr.get(id)!);
      for (const id of ids) teamToGroup.set(id, key);
    });
  }
  result.complete = shapeOk && games.length === 60;
  if (!result.complete || opts.dryRun) return result;

  for (const g of games) {
    const group = teamToGroup.get(g.homeTeam.id) ?? null;
    if (g.nbaCupGroup !== group) {
      await prisma.game.update({ where: { id: g.id }, data: { nbaCupGroup: group } });
      result.updated++;
    }
  }
  return result;
}

/**
 * Pour le pipeline : une seule requête quand les groupes sont déjà attribués.
 * Renvoie le nombre de matchs mis à jour.
 */
export async function ensureNbaCupGroups(prisma: PrismaClient, season: string, log: Logger = () => {}): Promise<number> {
  const missing = await prisma.game.count({ where: { season, nbaCupRound: "GroupPlay", nbaCupGroup: null } });
  if (missing === 0) return 0;

  const r = await inferNbaCupGroups(prisma, season);
  if (r.updated > 0) log(`🏆 NBA Cup : groupes attribués (${r.updated} matchs de poule)`);
  else if (!r.complete) log(`ℹ️  NBA Cup : ${r.games}/60 matchs de poule en base, groupes attribués quand le calendrier sera complet`);
  return r.updated;
}
