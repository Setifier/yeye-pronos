"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, TrendingUp, TrendingDown, User, ArrowLeft } from "lucide-react";
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
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
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
              {formatValue(Math.abs(myValue - friendValue))}
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
    <div className="space-y-8 py-8 px-4 max-w-7xl mx-auto">
      {/* Back button */}
      <Link
        href="/amis"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à mes amis
      </Link>

      {/* Header - Vous vs Ami */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 rounded-2xl p-8">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {/* Me */}
          <div className="flex flex-col items-center gap-3 flex-1 min-w-[200px]">
            {comparison.me.user.image ? (
              <img
                src={comparison.me.user.image}
                alt={comparison.me.user.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-500">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {comparison.me.user.name}
              </p>
              <p className="text-sm text-blue-400">Vous</p>
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-purple-500 bg-clip-text">
              VS
            </div>
          </div>

          {/* Friend */}
          <div className="flex flex-col items-center gap-3 flex-1 min-w-[200px]">
            {comparison.friend.user.image ? (
              <img
                src={comparison.friend.user.image}
                alt={comparison.friend.user.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center border-4 border-purple-500">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {comparison.friend.user.name}
              </p>
              <p className="text-sm text-purple-400">Ami</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-900/30 to-zinc-800 rounded-lg">
            <Trophy className="h-6 w-6 text-blue-400" />
          </div>
          Comparaison des Statistiques
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            myValue={comparison.me.winRate}
            friendValue={comparison.friend.winRate}
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

          {/* Current Streak */}
          <ComparisonBar
            title="Série en cours"
            myValue={comparison.me.currentStreak.count}
            friendValue={comparison.friend.currentStreak.count}
            myLabel={`${comparison.me.user.name} (${comparison.me.currentStreak.type === "WIN" ? "✓" : "✗"})`}
            friendLabel={`${comparison.friend.user.name} (${comparison.friend.currentStreak.type === "WIN" ? "✓" : "✗"})`}
            icon={<Trophy className="w-5 h-5" />}
          />

          {/* Competitions Participated */}
          <ComparisonBar
            title="Compétitions Participées"
            myValue={comparison.me.competitionsParticipated}
            friendValue={comparison.friend.competitionsParticipated}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Trophy className="w-5 h-5" />}
          />

          {/* Competitions Won */}
          <ComparisonBar
            title="Compétitions Gagnées"
            myValue={comparison.me.competitionsWon}
            friendValue={comparison.friend.competitionsWon}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            icon={<Trophy className="w-5 h-5" />}
          />

          {/* Competition Win Rate */}
          <ComparisonBar
            title="Ratio Victoires Compétitions"
            myValue={comparison.me.competitionsWinRate}
            friendValue={comparison.friend.competitionsWinRate}
            myLabel={comparison.me.user.name}
            friendLabel={comparison.friend.user.name}
            formatValue={(v) => `${v}%`}
            icon={<TrendingUp className="w-5 h-5" />}
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
                  {comparison.me.winRate}%
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.winRate}%
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
                    {comparison.differences.winRate}%
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
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">Série en cours</td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.me.currentStreak.count}{" "}
                  {comparison.me.currentStreak.type === "WIN" ? "✓" : "✗"}
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.currentStreak.count}{" "}
                  {comparison.friend.currentStreak.type === "WIN" ? "✓" : "✗"}
                </td>
                <td className="p-4 text-center text-zinc-500">-</td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">
                  Compétitions Participées
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.me.competitionsParticipated}
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.competitionsParticipated}
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold text-zinc-500">
                    {comparison.me.competitionsParticipated >
                    comparison.friend.competitionsParticipated
                      ? "+"
                      : ""}
                    {comparison.me.competitionsParticipated -
                      comparison.friend.competitionsParticipated}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-white font-medium">
                  Compétitions Gagnées
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.me.competitionsWon}
                </td>
                <td className="p-4 text-center text-white font-bold">
                  {comparison.friend.competitionsWon}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`font-bold ${
                      comparison.me.competitionsWon >
                      comparison.friend.competitionsWon
                        ? "text-green-500"
                        : comparison.me.competitionsWon <
                          comparison.friend.competitionsWon
                        ? "text-red-500"
                        : "text-zinc-500"
                    }`}
                  >
                    {comparison.me.competitionsWon >
                    comparison.friend.competitionsWon
                      ? "+"
                      : ""}
                    {comparison.me.competitionsWon -
                      comparison.friend.competitionsWon}
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
