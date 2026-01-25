"use client";

import Link from "next/link";
import { Trophy, Lock, TrendingUp, Star } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  reward: string | null;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  requirement?: number;
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

interface UserBadgesDisplayProps {
  badges: Badge[];
  stats: BadgeStats;
  variant?: "compact" | "featured";
  maxDisplay?: number;
}

export function UserBadgesDisplay({
  badges,
  stats,
  variant = "featured",
  maxDisplay = 6,
}: UserBadgesDisplayProps) {
  const getRarityColor = (rarity: string) => {
    const colors = {
      COMMON: "bg-zinc-600 text-zinc-100",
      RARE: "bg-blue-600 text-blue-100",
      EPIC: "bg-purple-600 text-purple-100",
      LEGENDARY: "bg-yellow-600 text-yellow-100",
    };
    return colors[rarity as keyof typeof colors] || colors.COMMON;
  };

  const getRarityGlow = (rarity: string) => {
    const glows = {
      COMMON: "shadow-zinc-500/20",
      RARE: "shadow-blue-500/30",
      EPIC: "shadow-purple-500/40",
      LEGENDARY: "shadow-yellow-500/50",
    };
    return glows[rarity as keyof typeof glows] || glows.COMMON;
  };

  // Trier les badges : débloqués d'abord, par rareté décroissante, puis par date
  const sortedBadges = [...badges]
    .filter((b) => b.isUnlocked)
    .sort((a, b) => {
      // Ordre de rareté pour tri
      const rarityOrder = { LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };
      const rarityDiff =
        rarityOrder[b.rarity] - rarityOrder[a.rarity];

      if (rarityDiff !== 0) return rarityDiff;

      // Si même rareté, trier par date (plus récent d'abord)
      if (a.unlockedAt && b.unlockedAt) {
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      }
      return 0;
    });

  const displayBadges = sortedBadges.slice(0, maxDisplay);

  if (variant === "compact") {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-900/30 to-zinc-800 rounded-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Badges</h3>
              <p className="text-sm text-zinc-400">
                {stats.unlocked}/{stats.total} débloqués
              </p>
            </div>
          </div>
          <Link
            href="/badges"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Voir tout
          </Link>
        </div>

        {/* Progression */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Progression globale</span>
            <span className="text-sm font-bold text-zinc-300">
              {stats.percentage}%
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Badges grid */}
        {displayBadges.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {displayBadges.map((badge) => (
              <div
                key={badge.id}
                className={`relative group bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-3 hover:border-zinc-600 transition-all cursor-pointer shadow-lg ${getRarityGlow(
                  badge.rarity
                )}`}
              >
                {/* Icon */}
                <div className="text-center mb-2">
                  <span className="text-3xl">{badge.icon}</span>
                </div>

                {/* Rarity badge */}
                <div className="absolute top-2 right-2">
                  <div
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getRarityColor(
                      badge.rarity
                    )}`}
                  >
                    {badge.rarity[0]}
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="text-xs font-bold text-white mb-1">
                    {badge.name}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Lock className="h-12 w-12 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Aucun badge débloqué</p>
            <p className="text-xs text-zinc-600 mt-1">
              Commence à pronostiquer !
            </p>
          </div>
        )}
      </div>
    );
  }

  // Variant "featured" (par défaut)
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-yellow-900/30 to-zinc-800 rounded-xl">
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Mes Badges</h2>
            <p className="text-sm text-zinc-400">
              {stats.unlocked}/{stats.total} badges débloqués
            </p>
          </div>
        </div>
        <Link
          href="/badges"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Voir la collection
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {/* Progression */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-purple-900/30 to-zinc-800 border border-purple-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="text-zinc-400 text-xs font-medium">
              Progression
            </span>
          </div>
          <p className="text-3xl font-bold text-purple-500">
            {stats.percentage}%
          </p>
        </div>

        {/* COMMON */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-600 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-400 text-xs font-medium">COMMON</span>
          </div>
          <p className="text-2xl font-bold text-zinc-300">
            {stats.byRarity.COMMON.unlocked}/{stats.byRarity.COMMON.total}
          </p>
        </div>

        {/* RARE */}
        <div className="bg-gradient-to-br from-blue-900/30 to-zinc-800 border border-blue-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-xs font-medium">RARE</span>
          </div>
          <p className="text-2xl font-bold text-blue-300">
            {stats.byRarity.RARE.unlocked}/{stats.byRarity.RARE.total}
          </p>
        </div>

        {/* EPIC */}
        <div className="bg-gradient-to-br from-purple-900/30 to-zinc-800 border border-purple-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-purple-400" />
            <span className="text-purple-400 text-xs font-medium">EPIC</span>
          </div>
          <p className="text-2xl font-bold text-purple-300">
            {stats.byRarity.EPIC.unlocked}/{stats.byRarity.EPIC.total}
          </p>
        </div>

        {/* LEGENDARY */}
        <div className="bg-gradient-to-br from-yellow-900/30 to-zinc-800 border border-yellow-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-400 text-xs font-medium">
              LEGENDARY
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-300">
            {stats.byRarity.LEGENDARY.unlocked}/
            {stats.byRarity.LEGENDARY.total}
          </p>
        </div>
      </div>

      {/* Featured badges */}
      {displayBadges.length > 0 ? (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">
            Badges prestigieux
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayBadges.map((badge) => (
              <div
                key={badge.id}
                className={`relative group bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 rounded-2xl p-4 hover:border-zinc-600 hover:scale-105 transition-all cursor-pointer shadow-lg ${getRarityGlow(
                  badge.rarity
                )}`}
              >
                {/* Icon */}
                <div className="text-center mb-3">
                  <span className="text-5xl">{badge.icon}</span>
                </div>

                {/* Rarity */}
                <div className="flex items-center justify-center mb-2">
                  <span
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${getRarityColor(
                      badge.rarity
                    )}`}
                  >
                    {badge.rarity}
                  </span>
                </div>

                {/* Name */}
                <p className="text-xs font-bold text-white text-center line-clamp-2 mb-1">
                  {badge.name}
                </p>

                {/* Reward (title) */}
                {badge.reward && (
                  <p className="text-[10px] text-yellow-500 text-center font-semibold">
                    {badge.reward}
                  </p>
                )}

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="text-xs font-bold text-white mb-1">
                    {badge.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 mb-2">
                    {badge.description}
                  </p>
                  {badge.unlockedAt && (
                    <p className="text-[10px] text-zinc-500">
                      Débloqué le{" "}
                      {new Date(badge.unlockedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Lock className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-lg font-bold text-zinc-500">
            Aucun badge débloqué
          </p>
          <p className="text-sm text-zinc-600 mt-2">
            Commence à pronostiquer pour débloquer tes premiers badges !
          </p>
        </div>
      )}
    </div>
  );
}
