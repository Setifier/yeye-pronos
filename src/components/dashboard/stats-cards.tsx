"use client";

import { CheckCircle, FileText, Percent, Award, Flame, Trophy, Crown } from "lucide-react";
import type { UserStats } from "@/lib/dashboard-queries";

interface StatsCardsProps {
  stats: UserStats | null;
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return <StatsCardsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Pronos */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Pronos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            label="Win Rate"
            value={`${stats.winRate}%`}
            gradient="from-[#ff5050] to-[#ff5050]/70"
            bgGradient="from-[#ff5050]/10 to-[#ff5050]/5"
            iconColor="text-[#ff5050]"
          />
        </div>
      </div>

      {/* Section 2: Points */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Points
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            icon={Award}
            label="Total Points"
            value={stats.totalPoints}
            gradient="from-[#dcff50] to-[#dcff50]/70"
            bgGradient="from-[#dcff50]/10 to-[#dcff50]/5"
            iconColor="text-[#dcff50]"
          />
          <StatCard
            icon={Flame}
            label="Série en cours"
            value={
              stats.currentStreak.count > 0
                ? `${stats.currentStreak.count} ${stats.currentStreak.type === "WIN" ? "✓" : "✗"}`
                : "0"
            }
            gradient={
              stats.currentStreak.type === "WIN"
                ? "from-orange-500 to-orange-500/70"
                : stats.currentStreak.type === "LOSS"
                ? "from-zinc-500 to-zinc-500/70"
                : "from-zinc-400 to-zinc-400/70"
            }
            bgGradient={
              stats.currentStreak.type === "WIN"
                ? "from-orange-500/10 to-orange-500/5"
                : stats.currentStreak.type === "LOSS"
                ? "from-zinc-500/10 to-zinc-500/5"
                : "from-zinc-400/10 to-zinc-400/5"
            }
            iconColor={
              stats.currentStreak.type === "WIN"
                ? "text-orange-500"
                : "text-zinc-400"
            }
          />
        </div>
      </div>

      {/* Section 3: Compétitions */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Compétitions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Trophy}
            label="Participations"
            value={stats.competitionsParticipated}
            gradient="from-purple-500 to-purple-500/70"
            bgGradient="from-purple-500/10 to-purple-500/5"
            iconColor="text-purple-500"
          />
          <StatCard
            icon={Crown}
            label="Victoires"
            value={stats.competitionsWon}
            gradient="from-yellow-500 to-yellow-500/70"
            bgGradient="from-yellow-500/10 to-yellow-500/5"
            iconColor="text-yellow-500"
          />
          <StatCard
            icon={Percent}
            label="Ratio Victoires"
            value={`${stats.competitionsWinRate}%`}
            gradient="from-amber-500 to-amber-500/70"
            bgGradient="from-amber-500/10 to-amber-500/5"
            iconColor="text-amber-500"
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
  gradient: string;
  bgGradient: string;
  iconColor: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  bgGradient,
  iconColor,
}: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br ${bgGradient} p-6 transition-all hover:scale-105 hover:border-zinc-700`}
    >
      {/* Icon */}
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${bgGradient}`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>

      {/* Value */}
      <div
        className={`mb-1 text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
      >
        {value}
      </div>

      {/* Label */}
      <div className="text-sm text-zinc-400">{label}</div>

      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((section) => (
        <div key={section}>
          <div className="mb-3 h-4 w-24 rounded bg-zinc-800 animate-pulse" />
          <div className={`grid grid-cols-1 md:grid-cols-${section === 2 ? 2 : 3} gap-4`}>
            {[...Array(section === 2 ? 2 : 3)].map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 animate-pulse"
              >
                <div className="mb-4 h-12 w-12 rounded-xl bg-zinc-800" />
                <div className="mb-2 h-8 w-20 rounded bg-zinc-800" />
                <div className="h-4 w-24 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
