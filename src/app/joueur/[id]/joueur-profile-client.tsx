"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentPredictionsList } from "@/components/dashboard/recent-predictions-list";
import { UserBadgesDisplay } from "@/components/user-badges-display";
import type { UserStats, RecentPrediction } from "@/lib/dashboard-queries";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { User, Trophy, Heart } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  reward: string | null;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

interface BadgeStats {
  total: number;
  unlocked: number;
  percentage: number;
  byRarity: {
    COMMON: { total: number; unlocked: number };
    RARE: { total: number; unlocked: number };
    EPIC: { total: number; unlocked: number };
    LEGENDARY: { total: number; unlocked: number };
  };
}

interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: Date;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    rarity: string;
    reward: string | null;
  };
}

interface PublicProfile {
  user: {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    favoriteTeam?: {
      id: string;
      name: string;
      city: string;
      abbreviation: string;
      logoUrl: string;
    } | null;
    favoritePlayer?: {
      id: string;
      fullName: string;
      position: string | null;
      jerseyNumber: string | null;
      team: {
        id: string;
        abbreviation: string;
        logoUrl: string;
      } | null;
    } | null;
  };
  stats: UserStats;
  recentPredictions: RecentPrediction[];
  badges: UserBadge[];
  rank: number;
}

interface JoueurProfileClientProps {
  profile: PublicProfile;
}

export function JoueurProfileClient({ profile }: JoueurProfileClientProps) {
  // Transform UserBadge[] to Badge[] format expected by UserBadgesDisplay
  const transformedBadges: Badge[] = profile.badges.map((userBadge) => ({
    id: userBadge.badge.id,
    name: userBadge.badge.name,
    description: userBadge.badge.description,
    icon: userBadge.badge.icon || "🏆",
    rarity: userBadge.badge.rarity as "COMMON" | "RARE" | "EPIC" | "LEGENDARY",
    reward: userBadge.badge.reward,
    isUnlocked: true,
    unlockedAt: userBadge.unlockedAt,
  }));

  // Calculate badge stats
  const badgeStats: BadgeStats = {
    total: transformedBadges.length,
    unlocked: transformedBadges.length, // All badges in profile are unlocked
    percentage: 100, // For public profile, we only show unlocked badges
    byRarity: {
      COMMON: {
        total: transformedBadges.filter((b) => b.rarity === "COMMON").length,
        unlocked: transformedBadges.filter((b) => b.rarity === "COMMON").length,
      },
      RARE: {
        total: transformedBadges.filter((b) => b.rarity === "RARE").length,
        unlocked: transformedBadges.filter((b) => b.rarity === "RARE").length,
      },
      EPIC: {
        total: transformedBadges.filter((b) => b.rarity === "EPIC").length,
        unlocked: transformedBadges.filter((b) => b.rarity === "EPIC").length,
      },
      LEGENDARY: {
        total: transformedBadges.filter((b) => b.rarity === "LEGENDARY").length,
        unlocked: transformedBadges.filter((b) => b.rarity === "LEGENDARY")
          .length,
      },
    },
  };

  // Format member since date
  const memberSince = formatDistanceToNow(new Date(profile.user.createdAt), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div className="space-y-8 py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            {profile.user.image ? (
              <img
                src={profile.user.image}
                alt={profile.user.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-zinc-700"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-zinc-700">
                <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </div>
            )}
            {/* Rank badge */}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-full px-4 py-2 font-bold text-sm shadow-lg border-2 border-zinc-900">
              #{profile.rank}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-white mb-2">
              {profile.user.name}
            </h1>
            <div className="flex flex-col md:flex-row items-center md:items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">
                  Classement: <span className="text-white">#{profile.rank}</span>
                </span>
              </div>
              <div className="hidden md:block text-zinc-700">•</div>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <span className="text-sm">
                  Membre {memberSince}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
          Favoris
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Équipe favorite */}
          <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            {profile.user.favoriteTeam ? (
              <>
                <img
                  src={profile.user.favoriteTeam.logoUrl}
                  alt={profile.user.favoriteTeam.name}
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <p className="text-xs text-zinc-500">Équipe favorite</p>
                  <p className="text-sm font-semibold text-white">
                    {profile.user.favoriteTeam.city}{" "}
                    {profile.user.favoriteTeam.name}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Équipe favorite</p>
                  <p className="text-sm text-zinc-600">Aucune équipe sélectionnée</p>
                </div>
              </>
            )}
          </div>

          {/* Joueur favori */}
          <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            {profile.user.favoritePlayer ? (
              <>
                {profile.user.favoritePlayer.team && (
                  <img
                    src={profile.user.favoritePlayer.team.logoUrl}
                    alt={profile.user.favoritePlayer.team.abbreviation}
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div>
                  <p className="text-xs text-zinc-500">Joueur favori</p>
                  <p className="text-sm font-semibold text-white">
                    {profile.user.favoritePlayer.fullName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {profile.user.favoritePlayer.position && (
                      <>{profile.user.favoritePlayer.position} • </>
                    )}
                    {profile.user.favoritePlayer.team?.abbreviation}
                    {profile.user.favoritePlayer.jerseyNumber && (
                      <> • #{profile.user.favoritePlayer.jerseyNumber}</>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Joueur favori</p>
                  <p className="text-sm text-zinc-600">Aucun joueur sélectionné</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-900/30 to-zinc-800 rounded-lg">
            <Trophy className="h-6 w-6 text-blue-400" />
          </div>
          Statistiques
        </h2>
        <StatsCards stats={profile.stats} />
      </div>

      {/* Recent Predictions */}
      {profile.recentPredictions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-900/30 to-zinc-800 rounded-lg">
              <Trophy className="h-6 w-6 text-purple-400" />
            </div>
            Derniers Pronos
          </h2>
          <RecentPredictionsList predictions={profile.recentPredictions} />
        </div>
      )}

      {/* Badges */}
      {transformedBadges.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-900/30 to-zinc-800 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            Badges Débloqués
          </h2>
          <UserBadgesDisplay
            badges={transformedBadges}
            stats={badgeStats}
            variant="compact"
            maxDisplay={6}
          />
        </div>
      )}

      {/* Empty state for no badges */}
      {transformedBadges.length === 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
          <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">
            Aucun badge débloqué pour le moment
          </p>
        </div>
      )}
    </div>
  );
}
