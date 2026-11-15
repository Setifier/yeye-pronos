/**
 * Meilleurs marqueurs d'un match, ex æquo compris (serveur).
 * Game.topScorerId n'en garde qu'un : les autres sont les joueurs du box score au même nombre de points
 * (Game.topScorerPoints). Tous comptent pour le bonus « meilleur marqueur » (src/types/bonus.ts).
 */

import type { PrismaClient } from "@/generated/prisma";

export interface TopScorer {
  playerId: string;
  fullName: string;
  lastName: string | null;
}

/** Une requête pour tous les matchs : gameId → meilleurs marqueurs (celui de Game.topScorerId en premier). */
export async function getTopScorersByGame(
  prisma: PrismaClient,
  games: Array<{ id: string; topScorerPoints: number | null; topScorerId?: string | null }>
): Promise<Map<string, TopScorer[]>> {
  const result = new Map<string, TopScorer[]>();
  const withTop = games.filter((g) => g.topScorerPoints !== null);
  if (withTop.length === 0) return result;

  const rows = await prisma.gamePlayerStats.findMany({
    where:  { OR: withTop.map((g) => ({ gameId: g.id, points: g.topScorerPoints! })) },
    select: { gameId: true, playerId: true, player: { select: { fullName: true, lastName: true } } },
  });

  const first = new Map(withTop.map((g) => [g.id, g.topScorerId ?? null]));
  for (const r of rows) {
    const list = result.get(r.gameId) ?? [];
    const scorer = { playerId: r.playerId, fullName: r.player.fullName, lastName: r.player.lastName };
    if (first.get(r.gameId) === r.playerId) list.unshift(scorer); else list.push(scorer);
    result.set(r.gameId, list);
  }
  return result;
}
