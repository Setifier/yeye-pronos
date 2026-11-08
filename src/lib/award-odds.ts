/**
 * Cotes des trophées de début de saison : MVP, Défenseur de l'année (DPOY), Rookie de l'année.
 *
 * Cote = rang dans un classement de référence de la saison passée (trophyPoints) :
 * 200 pts pour le 1er, +50 par place, 1 000 au maximum (hors classement compris).
 *
 *   MVP    : vote MVP puis équipes All-NBA. Un joueur absent des votes (souvent moins de
 *            65 matchs) se place juste derrière le dernier joueur voté qui avait une meilleure
 *            évaluation NBA que lui.
 *   DPOY   : vote DPOY puis équipes All-Defensive. Pas de stats : contres et interceptions
 *            mesurent mal la défense.
 *   Rookie : ordre de la draft. Seuls les joueurs de cette draft sont candidats.
 *
 * Les classements sont saisis une fois par saison dans AWARD_RANKINGS (docs/NOUVELLE-SAISON.md).
 */

import type { PrismaClient } from "@/generated/prisma";
import { getPreviousSeason } from "@/types/season";
import { TROPHY_POINTS, trophyPoints, type PlayerAwardType } from "@/types/special-predictions";

/** Un rang : un nom, ou plusieurs noms à égalité. */
type RankEntry = string | string[];

interface SeasonRankings {
  /** Vote MVP de la saison passée, puis les autres joueurs All-NBA (par points obtenus). */
  mvp: RankEntry[];
  /** Vote DPOY de la saison passée, puis les autres joueurs All-Defensive. */
  dpoy: RankEntry[];
  /** Draft de l'été, 1er choix en premier. */
  draft: string[];
}

/**
 * Sources 2026-27 (consultées le 7 novembre 2026) : basketball-reference.com/awards/awards_2026.html,
 * basketball-reference.com/draft/NBA_2026.html, Field Level Media et Hoops Rumors pour le vote DPOY
 * (seuls les 5 premiers rangs sont publiés : les suivants sont rangés par leurs points All-Defensive).
 */
export const AWARD_RANKINGS: Record<string, SeasonRankings> = {
  "2026-27": {
    mvp: [
      "Shai Gilgeous-Alexander", "Nikola Jokić", "Victor Wembanyama", "Luka Dončić", "Cade Cunningham",
      "Jaylen Brown", "Kawhi Leonard", "Donovan Mitchell",
      // All-NBA sans vote MVP
      "Kevin Durant", "Jalen Brunson", "Tyrese Maxey", "Jamal Murray", "Jalen Johnson", "Jalen Duren", "Chet Holmgren",
    ],
    dpoy: [
      "Victor Wembanyama", "Chet Holmgren", "Ausar Thompson", "Rudy Gobert", "Scottie Barnes",
      // All-Defensive
      "Derrick White", "Cason Wallace", "Bam Adebayo", "OG Anunoby", "Dyson Daniels",
      // Autres joueurs ayant reçu des votes
      "Amen Thompson", ["Jalen Duren", "Draymond Green"],
    ],
    draft: [
      "AJ Dybantsa", "Darryn Peterson", "Cameron Boozer", "Caleb Wilson", "Keaton Wagler",
      "Mikel Brown Jr.", "Darius Acuff Jr.", "Kingston Flemings", "Morez Johnson Jr.", "Brayden Burries",
      "Yaxel Lendeborg", "Aday Mara", "Nate Ament", "Hannes Steinbach", "Dailyn Swain",
      "Bennett Stirtz", "Ebuka Okorie", "Christian Anderson Jr.", "Allen Graves", "Jayden Quaintance",
      "Karim López", "Labaron Philon Jr.", "Zuby Ejiofor", "Cameron Carr", "Sergio de Larrea",
      "Tarris Reed Jr.", "Chris Cenac Jr.", "Joshua Jefferson", "Alex Karaban", "Koa Peat",
      "Bruce Thornton", "Richie Saunders", "Isaiah Evans", "Meleek Thomas", "Trevon Brazile",
      "Baba Miller", "Ryan Conwell", "Braden Smith", "Jack Kayil", "Dillon Mitchell",
      "Otega Oweh", "Ja'Kobi Gillespie", "Tyler Bilodeau", "Maliq Brown", "Emanuel Sharp",
      "Felix Okpara", "Tyler Nickel", "Tobi Lawal", "Bryce Hopkins", "Jaden Bradley",
      "Izaiyah Nelson", "Henri Veesaar", "Ugonna Onyenso", "Lajae Jones", "Nick Martinelli",
      "Vsevolod Ishchenko", "Narcisse Ngoy", "Jaron Pierre Jr.", "Trey Kaufman-Renn", "Malique Lewis",
    ],
  },
};

/** Matchs joués minimum la saison passée pour être placé d'après ses stats (MVP). */
const MIN_GAMES_FOR_STATS = 20;

export interface AwardOdds {
  rank: number;
  points: number;
}

export type AwardBoards = Record<PlayerAwardType, Map<string, AwardOdds>> & {
  /** Noms des classements MVP / DPOY introuvables dans la base (à corriger dans AWARD_RANKINGS). */
  unmatched: string[];
};

/** Nom comparable entre sources : sans accents, ponctuation ni suffixe (Jr., III…). */
export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’`-]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rangs « à l'olympique » : deux joueurs à égalité partagent le rang, le suivant le saute. */
function expandRanks(entries: RankEntry[]): { name: string; rank: number }[] {
  const out: { name: string; rank: number }[] = [];
  for (const entry of entries) {
    const names = Array.isArray(entry) ? entry : [entry];
    const rank = out.length + 1;
    for (const name of names) out.push({ name, rank });
  }
  return out;
}

/**
 * Cotes de chaque joueur pour les trois trophées (stables toute la saison : même calcul au pari et à la notation).
 * MVP et DPOY : un joueur absent de la table vaut la cote maximale.
 * Rookie : un joueur absent de la table n'est pas candidat.
 */
export async function getAwardBoards(prisma: PrismaClient, season: string): Promise<AwardBoards> {
  const boards: AwardBoards = {
    PRESEASON_MVP_SEASON: new Map(),
    PRESEASON_DPOY:       new Map(),
    PRESEASON_ROOKIE:     new Map(),
    unmatched:            [],
  };
  const rankings = AWARD_RANKINGS[season];
  if (!rankings) return boards;

  // Tous les joueurs, pas seulement ceux sous contrat : les rangs ne doivent pas bouger d'ici la notation
  // quand un joueur est coupé ou part à l'étranger.
  const players = await prisma.player.findMany({
    select: {
      id: true, fullName: true, teamId: true,
      seasonStats: {
        where:  { season: getPreviousSeason(season) },
        select: {
          gamesPlayed: true, totalPoints: true, totalRebounds: true, totalAssists: true,
          totalSteals: true, totalBlocks: true, totalFGA: true, totalFGM: true,
          totalFTA: true, totalFTM: true, totalTurnovers: true,
        },
        take: 1,
      },
    },
  });

  // Évaluation NBA par match : PTS + REB + AST + STL + BLK − tirs ratés − lancers ratés − balles perdues
  const eff = new Map<string, number>();
  const games = new Map<string, number>();
  for (const p of players) {
    const s = p.seasonStats[0];
    if (!s) continue;
    games.set(p.id, s.gamesPlayed);
    if (s.gamesPlayed < MIN_GAMES_FOR_STATS) continue;
    const total = s.totalPoints + s.totalRebounds + s.totalAssists + (s.totalSteals ?? 0) + (s.totalBlocks ?? 0)
      - ((s.totalFGA ?? 0) - (s.totalFGM ?? 0)) - ((s.totalFTA ?? 0) - (s.totalFTM ?? 0)) - (s.totalTurnovers ?? 0);
    eff.set(p.id, total / s.gamesPlayed);
  }

  // Noms → joueur (homonymes : celui sous contrat, puis celui qui a le plus joué la saison passée)
  const byName = new Map<string, string>();
  const hasTeam = new Map(players.map((p) => [p.id, !!p.teamId]));
  const better = (a: string, b: string) =>
    Number(hasTeam.get(a)) - Number(hasTeam.get(b)) || (games.get(a) ?? 0) - (games.get(b) ?? 0);
  for (const p of players) {
    const key = normalizePlayerName(p.fullName);
    const current = byName.get(key);
    if (!current || better(p.id, current) > 0) byName.set(key, p.id);
  }
  const lookup = (name: string) => byName.get(normalizePlayerName(name)) ?? null;
  const set = (type: PlayerAwardType, id: string, rank: number) =>
    boards[type].set(id, { rank, points: trophyPoints(rank) });

  // ── MVP : votes, puis les absents intercalés d'après leur évaluation ──
  const official = expandRanks(rankings.mvp).map(({ name }) => {
    const id = lookup(name);
    if (!id) boards.unmatched.push(`MVP : ${name}`);
    return { id, eff: id ? eff.get(id) ?? null : null };
  });
  const officialIds = new Set(official.map((o) => o.id).filter(Boolean));
  const after: string[][] = official.map(() => []);
  const absent = [...eff.entries()].filter(([id]) => !officialIds.has(id)).sort((a, b) => b[1] - a[1]);
  for (const [id, value] of absent) {
    // Juste derrière le dernier joueur voté qui avait une meilleure évaluation (jamais devant le 1er)
    let anchor = 0;
    official.forEach((o, i) => { if (o.eff != null && o.eff > value) anchor = i; });
    after[anchor].push(id);
  }
  let rank = 0;
  official.forEach((o, i) => {
    rank++;
    if (o.id) set("PRESEASON_MVP_SEASON", o.id, rank);
    for (const id of after[i]) set("PRESEASON_MVP_SEASON", id, ++rank);
  });

  // ── DPOY : votes uniquement ──
  for (const { name, rank: r } of expandRanks(rankings.dpoy)) {
    const id = lookup(name);
    if (id) set("PRESEASON_DPOY", id, r);
    else boards.unmatched.push(`DPOY : ${name}`);
  }

  // ── Rookie : ordre de la draft (un joueur draft non signé n'est simplement pas candidat) ──
  rankings.draft.forEach((name, i) => {
    const id = lookup(name);
    if (id) set("PRESEASON_ROOKIE", id, i + 1);
  });

  return boards;
}

/** Cote d'un joueur pour un trophée (null = pas candidat, uniquement pour le Rookie). */
export function awardPoints(boards: AwardBoards, type: PlayerAwardType, playerId: string): number | null {
  const odds = boards[type].get(playerId);
  if (odds) return odds.points;
  return type === "PRESEASON_ROOKIE" ? null : TROPHY_POINTS.MAX;
}
