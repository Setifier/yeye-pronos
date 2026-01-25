"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, ArrowRight, ChevronDown } from "lucide-react";
import type { LeaderboardData } from "@/lib/dashboard-queries";

interface Competition {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface MiniLeaderboardProps {
  leaderboard: LeaderboardData | null;
}

export function MiniLeaderboard({ leaderboard: initialLeaderboard }: MiniLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(
    initialLeaderboard
  );
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(
    null
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger les compétitions au montage
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await fetch("/api/competitions");
        if (response.ok) {
          const data = await response.json();
          setCompetitions(data.competitions);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des compétitions:", error);
      }
    };

    fetchCompetitions();
  }, []);

  // Recharger le classement quand la compétition change
  const handleCompetitionChange = async (competitionId: string | null) => {
    setSelectedCompetition(competitionId);
    setIsDropdownOpen(false);
    setLoading(true);

    try {
      const url = competitionId
        ? `/api/dashboard/leaderboard?competitionId=${competitionId}`
        : "/api/dashboard/leaderboard";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard({
          topUsers: data.topUsers,
          currentUser: data.currentUser,
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du classement:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!leaderboard && !loading) {
    return <MiniLeaderboardSkeleton />;
  }

  const selectedCompetitionName = selectedCompetition
    ? competitions.find((c) => c.id === selectedCompetition)?.name
    : "Classement Général";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#dcff50]" />
            <h3 className="text-lg font-semibold text-white">Classement</h3>
          </div>
        </div>

        {/* Competition Selector */}
        {competitions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
            >
              <span className="truncate">{selectedCompetitionName}</span>
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg">
                <div className="p-1">
                  <button
                    onClick={() => handleCompetitionChange(null)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      !selectedCompetition
                        ? "bg-[#5096ff] text-white"
                        : "text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Classement Général
                  </button>
                  {competitions.map((competition) => (
                    <button
                      key={competition.id}
                      onClick={() => handleCompetitionChange(competition.id)}
                      className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                        selectedCompetition === competition.id
                          ? "bg-[#5096ff] text-white"
                          : "text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {competition.name}
                      {competition.isActive && (
                        <span className="ml-2 text-xs text-green-500">
                          ● Actif
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard Content */}
      {loading ? (
        <div className="p-4">
          <div className="space-y-2 animate-pulse">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800" />
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                </div>
                <div className="h-4 w-12 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      ) : leaderboard?.topUsers && leaderboard.topUsers.length > 0 ? (
        <>
          <div className="p-4">
            <div className="space-y-2">
              {leaderboard.topUsers.map((user) => {
                const isCurrentUser =
                  leaderboard.currentUser && user.rank === leaderboard.currentUser.rank;
                const isTop3 = user.rank <= 3;

                return (
                  <div
                    key={user.userId}
                    className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                      isCurrentUser
                        ? "bg-[#5096ff]/10 border border-[#5096ff]/30"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    {/* Rank + Name */}
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      {isTop3 ? (
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                            user.rank === 1
                              ? "bg-yellow-500/20 text-yellow-500"
                              : user.rank === 2
                              ? "bg-zinc-400/20 text-zinc-400"
                              : "bg-orange-600/20 text-orange-600"
                          }`}
                        >
                          {user.rank}
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-zinc-500">
                          {user.rank}
                        </div>
                      )}

                      {/* Name */}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-[#5096ff]">
                              (Vous)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {user.predictions} pronos
                        </div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-sm font-bold text-white">
                      {user.points}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current User (if not in top 10) */}
            {leaderboard.currentUser &&
              !leaderboard.topUsers.some(
                (u) => u.rank === leaderboard.currentUser!.rank
              ) && (
                <>
                  <div className="my-4 border-t border-zinc-800" />
                  <div className="flex items-center justify-between rounded-lg border border-[#5096ff]/30 bg-[#5096ff]/10 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-zinc-400">
                        {leaderboard.currentUser.rank}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          Votre position
                        </div>
                        <div className="text-xs text-zinc-400">
                          {leaderboard.currentUser.predictions} pronos
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {leaderboard.currentUser.points}
                    </div>
                  </div>
                </>
              )}
          </div>

          {/* Footer Link */}
          <div className="border-t border-zinc-800 p-4">
            <Link
              href="/classement"
              className="flex items-center justify-center gap-2 text-sm font-medium text-[#5096ff] transition-colors hover:text-[#5096ff]/80"
            >
              Voir le classement complet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-zinc-400">Aucun classement disponible</p>
        </div>
      )}
    </div>
  );
}

function MiniLeaderboardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse">
      <div className="mb-4 h-6 w-32 rounded bg-zinc-800" />
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-800" />
              <div className="h-4 w-24 rounded bg-zinc-800" />
            </div>
            <div className="h-4 w-12 rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
