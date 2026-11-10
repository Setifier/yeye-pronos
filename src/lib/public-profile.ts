/**
 * Fiche d'un joueur de l'app (serveur) : profil, stats de la saison, rang au classement,
 * derniers pronos terminés et lien d'amitié avec celui qui regarde.
 * Utilisé par /profile, /joueur/[id] et GET /api/users/[id]/public-profile.
 */

import type { PrismaClient } from "@/generated/prisma";
import { getUserStats, type RecentPrediction, type UserStats } from "@/lib/dashboard-queries";
import { getSeasonRanking } from "@/lib/season-ranking";
import { getCurrentSeason } from "@/types/season";

/** Lien d'amitié vu par celui qui regarde la fiche. */
export type FriendshipStatus = "self" | "friends" | "sent" | "received" | "none";

export interface Friendship {
  status: FriendshipStatus;
  /** Demande reçue à accepter (status « received »). */
  requestId: string | null;
}

export interface PublicProfile {
  user: {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    favoriteTeam: { id: string; name: string; city: string; abbreviation: string; logoUrl: string | null } | null;
    favoritePlayer: {
      id: string;
      fullName: string;
      position: string | null;
      jerseyNumber: string | null;
      team: { id: string; abbreviation: string; logoUrl: string | null } | null;
    } | null;
  };
  season: string;
  stats: UserStats;
  recentPredictions: RecentPrediction[];
  /** Rang au classement de la saison (null = pas encore classé). */
  rank: number | null;
  /** Points de la saison (matchs + paris de saison), comme le classement. */
  points: number;
  totalPlayers: number;
  friendship: Friendship;
}

export async function getFriendship(prisma: PrismaClient, viewerId: string, targetId: string): Promise<Friendship> {
  if (viewerId === targetId) return { status: "self", requestId: null };
  const link = await prisma.friendRequest.findFirst({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [
        { senderId: viewerId, receiverId: targetId },
        { senderId: targetId, receiverId: viewerId },
      ],
    },
    select: { id: true, status: true, senderId: true },
  });
  if (!link) return { status: "none", requestId: null };
  if (link.status === "ACCEPTED") return { status: "friends", requestId: null };
  return link.senderId === viewerId
    ? { status: "sent", requestId: null }
    : { status: "received", requestId: link.id };
}

export async function getPublicProfile(
  prisma: PrismaClient,
  targetId: string,
  viewerId: string
): Promise<PublicProfile | null> {
  const season = getCurrentSeason();

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      favoriteTeam: { select: { id: true, name: true, city: true, abbreviation: true, logoUrl: true } },
      favoritePlayer: {
        select: {
          id: true,
          fullName: true,
          position: true,
          jerseyNumber: true,
          team: { select: { id: true, abbreviation: true, logoUrl: true } },
        },
      },
    },
  });
  if (!user) return null;

  const [stats, ranking, recent, friendship] = await Promise.all([
    getUserStats(targetId, season),
    getSeasonRanking(prisma, season),
    // Derniers pronos TERMINÉS uniquement (jamais un prono en cours : on ne copie pas)
    prisma.prediction.findMany({
      where: { userId: targetId, result: { in: ["WON", "LOST"] } },
      include: {
        game: {
          include: {
            homeTeam: { select: { name: true, city: true, abbreviation: true } },
            awayTeam: { select: { name: true, city: true, abbreviation: true } },
          },
        },
      },
      orderBy: { game: { gameDate: "desc" } },
      take: 10,
    }),
    getFriendship(prisma, viewerId, targetId),
  ]);

  const entry = ranking.find((e) => e.userId === targetId);

  return {
    user,
    season,
    stats,
    recentPredictions: recent.map((p) => ({
      id: p.id,
      gameId: p.gameId,
      gameDate: p.game.gameDate,
      homeTeam: p.game.homeTeam,
      awayTeam: p.game.awayTeam,
      predictedTeam: p.predictedTeamId === p.game.homeTeamId ? p.game.homeTeam : p.game.awayTeam,
      result: p.result,
      pointsEarned: p.pointsEarned,
      marginBonusPoints: p.marginBonusPoints,
      topScorerBonusPoints: p.topScorerBonusPoints,
      comboBonusPoints: p.comboBonusPoints,
      finalScore: { home: p.game.homeScore, away: p.game.awayScore },
    })),
    rank: entry?.rank ?? null,
    points: entry?.points ?? 0,
    totalPlayers: ranking.length,
    friendship,
  };
}
