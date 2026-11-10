"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, TrendingUp, TrendingDown, User, ArrowLeft, Target, Star, CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { UserStats } from "@/lib/dashboard-queries";

interface ComparisonData {
  me: UserStats & { user: { id: string; name: string; image: string | null } };
  friend: UserStats & { user: { id: string; name: string; image: string | null } };
  differences: {
    points: number;
    winRate: number;
  };
}

interface ComparisonBarProps {
  title: string;
  myValue: number;
  friendValue: number;
  myLabel: string;
  friendLabel: string;
  formatValue?: (value: number) => string;
  icon?: React.ReactNode;
}

function ComparisonBar({
  title,
  myValue,
  friendValue,
  myLabel,
  friendLabel,
  formatValue = (v) => v.toString(),
  icon,
}: ComparisonBarProps) {
  const maxValue = Math.max(myValue, friendValue);
  const myPercent = maxValue > 0 ? (myValue / maxValue) * 100 : 0;
  const friendPercent = maxValue > 0 ? (friendValue / maxValue) * 100 : 0;

  const isWinning = myValue > friendValue;
  const isTie = myValue === friendValue;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        {icon && <div className="text-zinc-400">{icon}</div>}
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {/* My Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-400">{myLabel}</span>
            <span className="text-sm font-bold text-white">
              {formatValue(myValue)}
            </span>
          </div>
          <div className="h-8 bg-zinc-800 rounded-lg overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 flex items-center justify-end pr-3`}
              style={{ width: `${myPercent}%` }}
            >
              {myPercent > 20 && (
                <span className="text-xs font-bold text-white">
                  {formatValue(myValue)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Friend Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-400">
              {friendLabel}
            </span>
            <span className="text-sm font-bold text-white">
              {formatValue(friendValue)}
            </span>
          </div>
          <div className="h-8 bg-zinc-800 rounded-lg overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 flex items-center justify-end pr-3`}
              style={{ width: `${friendPercent}%` }}
            >
              {friendPercent > 20 && (
                <span className="text-xs font-bold text-white">
                  {formatValue(friendValue)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Difference indicator */}
      {!isTie && (
        <div
          className={`mt-4 flex items-center gap-2 text-sm ${
            isWinning ? "text-green-500" : "text-red-500"
          }`}
        >
          {isWinning ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>
            {isWinning ? "Vous êtes en avance" : "Vous êtes en retard"} de{" "}
            <span className="font-bold">
              {formatValue(Math.round(Math.abs(myValue - friendValue) * 10) / 10)}
            </span>
          </span>
        </div>
      )}
      {isTie && (
        <div className="mt-4 text-sm text-zinc-500 flex items-center gap-2">
          <span>Égalité parfaite !</span>
        </div>
      )}
    </div>
  );
}

export default function ComparerPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const resolvedParams = use(params);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchComparison();
  }, [resolvedParams.friendId]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/friends/${resolvedParams.friendId}/compare`);

      if (response.status === 401) {
        router.push("/auth/login?redirect=/amis");
        return;
      }

      if (response.status === 403) {
        setError("Vous devez être ami avec cet utilisateur pour comparer vos stats");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données");
      }

      const data = await response.json();
      if (data.success) {
        setComparison(data.comparison);
      } else {
        setError(data.error || "Erreur lors du chargement");
      }
    } catch (err) {
      console.error("Error fetching comparison:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 text-center">
          <p className="text-red-400 text-lg mb-4">{error || "Erreur"}</p>
          <Link
            href="/amis"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à mes amis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:space-y-8 md:py-8">
      {/* Back button */}
      <Link
        href="/amis"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white md:text-base"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à mes amis
      </Link>

      {/* Header - Vous vs Ami (une seule ligne sur téléphone) */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4 md:p-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:flex md:flex-wrap md:justify-center md:gap-8">
          {/* Me */}
          <div className="flex min-w-0 flex-col items-center gap-2 md:min-w-[200px] md:flex-1 md:gap-3">
            {comparison.me.user.image ? (
              <img
                src={comparison.me.user.image}
                alt={comparison.me.user.name}
                className="h-16 w-16 rounded-full border-4 border-blue-500 object-cover md:h-24 md:w-24"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-blue-500 bg-gradient-to-br from-blue-500 to-blue-600 md:h-24 md:w-24">
                <User className="h-8 w-8 text-white md:h-12 md:w-12" />
              </div>
            )}
            <div className="w-full min-w-0 text-center">
              <p className="truncate text-base font-bold text-white md:text-xl">
                {comparison.me.user.name}
              </p>
              <p className="text-xs text-blue-400 md:text-sm">Toi</p>
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent md:text-5xl">
              VS
            </div>
          </div>

          {/* Friend */}
          <div className="flex min-w-0 flex-col items-center gap-2 md:min-w-[200px] md:flex-1 md:gap-3">
            {comparison.friend.user.image ? (
              <img
                src={comparison.friend.user.image}
                alt={comparison.friend.user.name}
                className="h-16 w-16 rounded-full border-4 border-purple-500 object-cover md:h-24 md:w-24"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-purple-500 bg-gradient-to-br from-purple-500 to-purple-600 md:h-24 md:w-24">
                <User className="h-8 w-8 text-white md:h-12 md:w-12" />
              </div>
            )}
            <div className="w-full min-w-0 text-center">
              <p className="truncate text-base font-bold text-white md:text-xl">
                {comparison.friend.user.name}
              </p>
              <p className="text-xs text-purple-400 md:text-sm">Ami</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparaison nuit par nuit, avec les bonus */}
      <Link
        href={`/joueur/${comparison.friend.user.id}/pronos`}
        className="flex items-center gap-3 rounded-2xl border border-[#5096ff]/30 bg-[#5096ff]/10 p-4 transition-colors hover:bg-[#5096ff]/15"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#5096ff]/20">
          <CalendarDays className="h-5 w-5 text-[#5096ff]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">Comparer nuit par nuit</span>
          <span className="block text-xs text-zinc-400">Vos paris match par match, avec les bonus et les points</span>
        </span>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#5096ff]" />
      </Link>

      {/* Comparison Charts */}
      <div>
        <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-white md:mb-6 md:text-2xl">
          <div className="p-2 bg-gradient-to-br from-blue-900/30 to-zinc-800 rounded-lg">
            <Trophy className="h-6 w-6 text-blue-400" />
          </div>
          Comparaison des Statistiques
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
          {/* Total Points */}
          <ComparisonBar
            title="Points Totaux"
            myValue={comparison.me.totalPoints}
            friendValue={comparison.friend.totalPoints}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Trophy className="w-5 h-5" />}
          />

          {/* Win Rate */}
          <ComparisonBar
            title="Win Rate"
            myValue={Math.round(comparison.me.winRate * 10) / 10}
            friendValue={Math.round(comparison.friend.winRate * 10) / 10}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            formatValue={(v) => `${v}%`}
            icon={<TrendingUp className="w-5 h-5" />}
          />

          {/* Pronos Réussis */}
          <ComparisonBar
            title="Pronos Réussis"
            myValue={comparison.me.wonPredictions}
            friendValue={comparison.friend.wonPredictions}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Trophy className="w-5 h-5" />}
          />

          {/* Total Pronos */}
          <ComparisonBar
            title="Total Pronos"
            myValue={comparison.me.totalPredictions}
            friendValue={comparison.friend.totalPredictions}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Trophy className="w-5 h-5" />}
          />

          {/* Bonus */}
          <ComparisonBar
            title="Bons écarts"
            myValue={comparison.me.marginBonusCount}
            friendValue={comparison.friend.marginBonusCount}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Target className="w-5 h-5" />}
          />
          <ComparisonBar
            title="Meilleurs marqueurs trouvés"
            myValue={comparison.me.topScorerBonusCount}
            friendValue={comparison.friend.topScorerBonusCount}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Star className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold text-white">Tableau Comparatif</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50">
                <th className="text-left p-4 text-zinc-400 font-medium">
                  Statistique
                </th>
                <th className="text-center p-4 text-blue-400 font-bold">
                  {comparison.me.user.name}
                </th>
                <th className="text-center p-4 text-purple-400 font-bold">
                  {comparison.friend.user.name}
                </th>
                <th className="text-center p-4 text-zinc-400 font-medium">
                  Différence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">Points Totaux</td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.me.totalPoints}
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.totalPoints}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`font-bold ${
                      comparison.differences.points > 0
                        ? "text-green-500"
                        : comparison.differences.points < 0
                        ? "text-red-500"
                        : "text-zinc-500"
                    }`}
                  >
                    {comparison.differences.points > 0 ? "+" : ""}
                    {comparison.differences.points}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">Win Rate</td>
                <td className="p-4 text-center text-white font-bold">
                  {Math.round(comparison.me.winRate * 10) / 10}%
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {Math.round(comparison.friend.winRate * 10) / 10}%
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`font-bold ${
                      comparison.differences.winRate > 0
                        ? "text-green-500"
                        : comparison.differences.winRate < 0
                        ? "text-red-500"
                        : "text-zinc-500"
                    }`}
                  >
                    {comparison.differences.winRate > 0 ? "+" : ""}
                    {Math.round(comparison.differences.winRate * 10) / 10}%
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">Pronos Réussis</td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.me.wonPredictions}
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.wonPredictions}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`font-bold ${
                      comparison.me.wonPredictions >
                      comparison.friend.wonPredictions
                        ? "text-green-500"
                        : comparison.me.wonPredictions <
                          comparison.friend.wonPredictions
                        ? "text-red-500"
                        : "text-zinc-500"
                    }`}
                  >
                    {comparison.me.wonPredictions >
                    comparison.friend.wonPredictions
                      ? "+"
                      : ""}
                    {comparison.me.wonPredictions -
                      comparison.friend.wonPredictions}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">Total Pronos</td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.me.totalPredictions}
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.totalPredictions}
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold text-zinc-500">
                    {comparison.me.totalPredictions >
                    comparison.friend.totalPredictions
                      ? "+"
                      : ""}
                    {comparison.me.totalPredictions -
                      comparison.friend.totalPredictions}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
