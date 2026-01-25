"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";

interface PlayerStatsData {
  player: {
    id: string;
    fullName: string;
  };
  averages: {
    gamesPlayed: number;
    ppg: string;
    rpg: string;
    apg: string;
    spg: string;
    bpg: string;
    tpg: string;
    fgPercentage: string;
    threePtPercentage: string;
    ftPercentage: string;
  } | null;
  totals: {
    gamesPlayed: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    doubleDoubles: number;
    tripleDoubles: number;
  } | null;
  lastGames: Array<{
    gameId: string;
    gameDate: string;
    opponent: string;
    points: number;
    rebounds: number | null;
    assists: number | null;
    steals: number | null;
    blocks: number | null;
    minutes: string | null;
    fieldGoals: string;
    threePointers: string;
    freeThrows: string;
    plusMinus: number | null;
    isDoubleDouble: boolean;
    isTripleDouble: boolean;
  }>;
  message?: string;
}

interface PlayerStatsProps {
  playerId: string;
}

export function PlayerStats({ playerId }: PlayerStatsProps) {
  const [data, setData] = useState<PlayerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/players/${playerId}/stats`);
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des stats");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [playerId]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-500 text-lg">
          {error || "Impossible de charger les statistiques"}
        </p>
      </div>
    );
  }

  if (!data.averages || data.averages.gamesPlayed === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-500 text-lg">
          {data.message || "Aucune statistique disponible pour ce joueur"}
        </p>
      </div>
    );
  }

  const { averages, totals, lastGames } = data;

  return (
    <div className="space-y-6">
      {/* Season Averages */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-[#5096ff]" />
          <h2 className="text-xl font-bold">Moyennes de la saison</h2>
          <span className="ml-auto text-sm text-zinc-400">
            {averages.gamesPlayed} matchs joués
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {/* Points */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{averages.ppg}</p>
            <p className="text-xs text-zinc-400 mt-1">PTS</p>
          </div>

          {/* Rebounds */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{averages.rpg}</p>
            <p className="text-xs text-zinc-400 mt-1">REB</p>
          </div>

          {/* Assists */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{averages.apg}</p>
            <p className="text-xs text-zinc-400 mt-1">AST</p>
          </div>

          {/* Steals */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{averages.spg}</p>
            <p className="text-xs text-zinc-400 mt-1">STL</p>
          </div>

          {/* Blocks */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{averages.bpg}</p>
            <p className="text-xs text-zinc-400 mt-1">BLK</p>
          </div>
        </div>

        {/* Shooting percentages */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {averages.fgPercentage}%
            </p>
            <p className="text-xs text-zinc-400 mt-1">FG%</p>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {averages.threePtPercentage}%
            </p>
            <p className="text-xs text-zinc-400 mt-1">3PT%</p>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {averages.ftPercentage}%
            </p>
            <p className="text-xs text-zinc-400 mt-1">FT%</p>
          </div>
        </div>
      </div>

      {/* Last 10 Games */}
      {lastGames.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-[#5096ff]" />
            <h2 className="text-xl font-bold">
              {lastGames.length === 10
                ? "10 derniers matchs"
                : `${lastGames.length} derniers matchs`}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">vs</th>
                  <th className="px-3 py-3 text-center">MIN</th>
                  <th className="px-3 py-3 text-center">PTS</th>
                  <th className="px-3 py-3 text-center">REB</th>
                  <th className="px-3 py-3 text-center">AST</th>
                  <th className="px-3 py-3 text-center">FG</th>
                  <th className="px-3 py-3 text-center">3PT</th>
                  <th className="px-3 py-3 text-center">FT</th>
                  <th className="px-3 py-3 text-center">+/-</th>
                  <th className="px-3 py-3 text-center">DD/TD</th>
                  <th className="px-3 py-3 text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                {lastGames.map((game) => (
                  <tr
                    key={game.gameId}
                    className="border-t border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(game.gameDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{game.opponent}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">
                      {game.minutes || "-"}
                    </td>
                    <td className="px-3 py-3 text-center font-bold">
                      {game.points}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {game.rebounds ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {game.assists ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-400">
                      {game.fieldGoals}
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-400">
                      {game.threePointers}
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-400">
                      {game.freeThrows}
                    </td>
                    <td
                      className={`px-3 py-3 text-center font-medium ${
                        (game.plusMinus ?? 0) > 0
                          ? "text-green-500"
                          : (game.plusMinus ?? 0) < 0
                          ? "text-red-500"
                          : ""
                      }`}
                    >
                      {game.plusMinus !== null
                        ? (game.plusMinus > 0 ? "+" : "") + game.plusMinus
                        : "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {game.isTripleDouble ? (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">
                          TD
                        </span>
                      ) : game.isDoubleDouble ? (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                          DD
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Link
                        href={`/matchs/${game.gameId}`}
                        className="text-[#5096ff] hover:text-[#5096ff]/80 text-xs"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Season Totals */}
      {totals && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Totaux de la saison</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {totals.gamesPlayed}
              </p>
              <p className="text-xs text-zinc-400 mt-1">GP</p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{totals.points}</p>
              <p className="text-xs text-zinc-400 mt-1">PTS</p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{totals.rebounds}</p>
              <p className="text-xs text-zinc-400 mt-1">REB</p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{totals.assists}</p>
              <p className="text-xs text-zinc-400 mt-1">AST</p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{totals.steals}</p>
              <p className="text-xs text-zinc-400 mt-1">STL</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{totals.doubleDoubles}</p>
              <p className="text-xs text-yellow-500/70 mt-1">DD</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{totals.tripleDoubles}</p>
              <p className="text-xs text-purple-500/70 mt-1">TD</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
