"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, TrendingUp, Users, Loader2, Crown } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  image: string | null;
  totalPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  totalPoints: number;
  winRate: number;
  isCurrentUser: boolean;
}

export default function ClassementPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/classement");

      if (!response.ok) {
        throw new Error("Erreur lors du chargement");
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard);
      setCurrentUserRank(data.currentUserRank);
      setTotalPlayers(data.totalPlayers);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
            <Crown className="h-5 w-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600">
            <Medal className="h-5 w-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800">
            <span className="text-sm font-bold text-zinc-400">#{rank}</span>
          </div>
        );
    }
  };

  // Top 3 pour le podium
  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center gap-3 mb-4">
            <img src="/logo.png" alt="Yeye Pronos" className="h-16 md:h-20 w-auto" />
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-[#ff5050] via-[#5096ff] to-[#dcff50] bg-clip-text text-transparent">
                Classement
              </span>
            </h1>
          </div>
          <p className="text-center text-zinc-400 text-lg">
            Les meilleurs pronostiqueurs de la saison
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#5096ff]" />
              <span className="text-zinc-300">
                <span className="font-bold text-white">{totalPlayers}</span> joueurs
              </span>
            </div>
            {currentUserRank && (
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-[#dcff50]" />
                <span className="text-zinc-300">
                  Votre rang : <span className="font-bold text-[#dcff50]">#{currentUserRank}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">Aucun joueur dans le classement pour le moment</p>
          </div>
        ) : (
          <>
            {/* Podium Top 3 */}
            {topThree.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-[#dcff50]" />
                  Podium
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topThree.map((entry) => (
                    <div
                      key={entry.id}
                      className={`relative rounded-xl border p-6 ${
                        entry.rank === 1
                          ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30"
                          : entry.rank === 2
                          ? "bg-gradient-to-br from-gray-400/20 to-gray-500/10 border-gray-400/30"
                          : "bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30"
                      } ${entry.isCurrentUser ? "ring-2 ring-[#5096ff]" : ""}`}
                    >
                      {/* Rank Badge */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        {getRankBadge(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <div className="flex flex-col items-center mt-4">
                        {entry.image ? (
                          <img
                            src={entry.image}
                            alt={entry.name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-zinc-800"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5096ff] to-[#ff5050] flex items-center justify-center border-4 border-zinc-800">
                            <span className="text-2xl font-bold text-white">
                              {entry.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* Name */}
                        <h3 className="mt-4 text-lg font-bold text-white text-center">
                          {entry.name}
                          {entry.isCurrentUser && (
                            <span className="ml-2 text-xs text-[#5096ff]">(Vous)</span>
                          )}
                        </h3>

                        {/* Stats */}
                        <div className="mt-4 w-full space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">Points</span>
                            <span className="font-bold text-purple-500">{entry.totalPoints}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">Win Rate</span>
                            <span className="font-bold text-blue-500">{entry.winRate}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">Pronos</span>
                            <span className="font-bold text-zinc-300">
                              {entry.wonPredictions}/{entry.totalPredictions}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rest of Leaderboard */}
            {restOfLeaderboard.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-[#5096ff]" />
                  Classement complet
                </h2>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-800/50 border-b border-zinc-700 text-xs font-medium text-zinc-400">
                    <div className="col-span-1">Rang</div>
                    <div className="col-span-4">Joueur</div>
                    <div className="col-span-2 text-center">Pronos</div>
                    <div className="col-span-2 text-center">Win Rate</div>
                    <div className="col-span-3 text-center">Points</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-zinc-800">
                    {restOfLeaderboard.map((entry) => (
                      <div
                        key={entry.id}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors ${
                          entry.isCurrentUser ? "bg-[#5096ff]/10 border-l-4 border-[#5096ff]" : ""
                        }`}
                      >
                        {/* Rank */}
                        <div className="md:col-span-1 flex items-center">
                          <span className="text-sm font-bold text-zinc-400">#{entry.rank}</span>
                        </div>

                        {/* Player */}
                        <div className="md:col-span-4 flex items-center gap-3">
                          {entry.image ? (
                            <img
                              src={entry.image}
                              alt={entry.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5096ff] to-[#ff5050] flex items-center justify-center">
                              <span className="text-sm font-bold text-white">
                                {entry.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {entry.name}
                              {entry.isCurrentUser && (
                                <span className="ml-2 text-xs text-[#5096ff]">(Vous)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Predictions */}
                        <div className="md:col-span-2 flex md:justify-center items-center">
                          <span className="text-sm">
                            <span className="text-green-500 font-bold">{entry.wonPredictions}</span>
                            <span className="text-zinc-500"> / </span>
                            <span className="text-zinc-400">{entry.totalPredictions}</span>
                          </span>
                        </div>

                        {/* Win Rate */}
                        <div className="md:col-span-2 flex md:justify-center items-center">
                          <span className="text-sm font-bold text-blue-500">{entry.winRate}%</span>
                        </div>

                        {/* Points */}
                        <div className="md:col-span-3 flex md:justify-center items-center">
                          <span className="text-lg font-bold text-purple-500">{entry.totalPoints}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
