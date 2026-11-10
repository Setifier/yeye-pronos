"use client";

import { CheckCircle, FileText, Percent, Award, Target, Crosshair, Zap } from "lucide-react";
import type { UserStats } from "@/lib/dashboard-queries";

interface StatsCardsProps {
  stats: UserStats | null;
}

/**
 * Stats d'un joueur (profil, fiche). Sur téléphone : tuiles compactes 3 + 2 par ligne ;
 * à partir de md : grandes cartes (inchangé).
 */
export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return <StatsCardsSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Section 1: Pronos */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 md:mb-3 md:text-sm">
          Pronos
        </h3>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <StatCard
            icon={CheckCircle}
            label="Pronos Réussis"
            value={stats.wonPredictions}
            gradient="from-green-500 to-green-500/70"
            bgGradient="from-green-500/10 to-green-500/5"
            iconColor="text-green-500"
          />
          <StatCard
            icon={FileText}
            label="Total Pronos"
            value={stats.totalPredictions}
            gradient="from-[#5096ff] to-[#5096ff]/70"
            bgGradient="from-[#5096ff]/10 to-[#5096ff]/5"
            iconColor="text-[#5096ff]"
          />
          <StatCard
            icon={Percent}
            label="Réussite"
            value={`${stats.winRate}%`}
            gradient="from-[#ff5050] to-[#ff5050]/70"
            bgGradient="from-[#ff5050]/10 to-[#ff5050]/5"
            iconColor="text-[#ff5050]"
          />
        </div>
      </div>

      {/* Section 2: Points */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 md:mb-3 md:text-sm">
          Points
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          <StatCard
            icon={Award}
            label="Total Points"
            value={stats.totalPoints}
            gradient="from-[#dcff50] to-[#dcff50]/70"
            bgGradient="from-[#dcff50]/10 to-[#dcff50]/5"
            iconColor="text-[#dcff50]"
          />
          <StatCard
            icon={Target}
            label="Bons Écarts"
            value={`${stats.marginBonusCount}x`}
            subtitle={`+${stats.marginBonusPoints} pts`}
            gradient="from-orange-500 to-orange-500/70"
            bgGradient="from-orange-500/10 to-orange-500/5"
            iconColor="text-orange-500"
          />
          <StatCard
            icon={Crosshair}
            label="Top Scorers"
            value={`${stats.topScorerBonusCount}x`}
            subtitle={`+${stats.topScorerBonusPoints} pts`}
            gradient="from-cyan-500 to-cyan-500/70"
            bgGradient="from-cyan-500/10 to-cyan-500/5"
            iconColor="text-cyan-500"
          />
          <StatCard
            icon={Zap}
            label="Combos Ultimes"
            value={`${stats.comboBonusCount}x`}
            subtitle={`+${stats.comboBonusPoints} pts`}
            gradient="from-purple-500 to-purple-500/70"
            bgGradient="from-purple-500/10 to-purple-500/5"
            iconColor="text-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  gradient: string;
  bgGradient: string;
  iconColor: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  gradient,
  bgGradient,
  iconColor,
}: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br ${bgGradient} p-3 transition-all md:p-6 md:hover:scale-105 md:hover:border-zinc-700`}
    >
      {/* Icon */}
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br md:h-12 md:w-12 md:rounded-xl ${bgGradient}`}
        >
          <Icon className={`h-4 w-4 md:h-6 md:w-6 ${iconColor}`} />
        </div>
      </div>

      {/* Value */}
      <div
        className={`mb-0.5 bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent md:mb-1 md:text-3xl ${gradient}`}
      >
        {value}
      </div>

      {/* Subtitle (bonus points) */}
      {subtitle && (
        <div className={`text-xs font-semibold opacity-80 md:text-sm ${iconColor}`}>
          {subtitle}
        </div>
      )}

      {/* Label */}
      <div className="text-[11px] leading-tight text-zinc-400 md:text-sm">{label}</div>

      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 transition-opacity md:group-hover:opacity-100" />
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-3 h-4 w-24 rounded bg-zinc-800 animate-pulse" />
          <div className={`grid gap-2 md:gap-4 ${section === 2 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
            {[...Array(section === 2 ? 4 : 3)].map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 animate-pulse md:p-6"
              >
                <div className="mb-4 h-8 w-8 rounded-xl bg-zinc-800 md:h-12 md:w-12" />
                <div className="mb-2 h-6 w-16 rounded bg-zinc-800 md:h-8 md:w-20" />
                <div className="h-4 w-20 rounded bg-zinc-800 md:w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
