"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  TrendingUp,
  Loader2,
  Filter,
  Calendar,
  Target,
  Award,
  Percent,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PredictionCard } from "@/components/prediction-card";
import { GameCard } from "@/components/game-card";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
}

interface GameTeam {
  id: number;
  dbId: string;
  name: string;
  full_name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
}

interface Game {
  id: number;
  dbId: string;
  date: string;
  dateUTC?: string;
  status: string;
  home_team: GameTeam;
  visitor_team: GameTeam;
  home_team_score?: number | null;
  visitor_team_score?: number | null;
  currentPeriod?: number | null;
  gameClock?: string | null;
}

interface Prediction {
  id: string;
  gameId: string;
  gameDate: string;
  localGameDate: string;
  game: Game;
  homeTeam: Team;
  awayTeam: Team;
  predictedTeam: {
    id: string;
    name: string;
    abbreviation: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  result: "PENDING" | "WON" | "LOST";
  pointsEarned: number;
  createdAt: string;
}

interface Stats {
  total: number;
  won: number;
  lost: number;
  pending: number;
  winRate: number;
  totalPoints: number;
}

type FilterType = "ALL" | "PENDING" | "WON" | "LOST";

export default function PronosPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPredictions();
  }, [activeFilter]);

  // Auto-expand all dates when predictions change
  useEffect(() => {
    if (predictions.length > 0) {
      const dates = new Set(predictions.map((pred) => formatDateUS(pred.gameDate)));
      setExpandedDates(dates);
    }
  }, [predictions]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const filterParam = activeFilter === "ALL" ? "" : `?filter=${activeFilter}`;
      const response = await fetch(`/api/pronos${filterParam}`);

      if (response.status === 401) {
        redirect("/auth/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Erreur lors du chargement");
      }

      const data = await response.json();
      setPredictions(data.predictions);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Formater la date selon le fuseau horaire US (Eastern Time)
  const formatDateUS = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "America/New_York",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Grouper les pronos par date US (Eastern Time) - PAS Paris !
  const groupPredictionsByDate = () => {
    const groups: { [key: string]: Prediction[] } = {};

    predictions.forEach((pred) => {
      const dateKey = formatDateUS(pred.gameDate); // Utiliser la date US !
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(pred);
    });

    return groups;
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const groupedPredictions = groupPredictionsByDate();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center gap-3 mb-4">
            <img src="/logo.png" alt="Yeye Pronos" className="h-16 md:h-20 w-auto" />
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-[#ff5050] via-[#5096ff] to-[#dcff50] bg-clip-text text-transparent">
                Mes Pronos
              </span>
            </h1>
          </div>
          <p className="text-center text-zinc-400 text-lg">
            Suivez vos pronos et votre progression
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {/* Total */}
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 hover:border-[#5096ff]/30 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-zinc-700/50 rounded-lg">
                      <Target className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Total</div>
                  </div>
                  <div className="text-white text-3xl font-bold">{stats.total}</div>
                  <div className="text-zinc-500 text-xs mt-1">pronos</div>
                </div>

                {/* Gagnés */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-xl p-5 hover:border-green-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Trophy className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-green-400 text-xs font-medium uppercase tracking-wide">Gagnés</div>
                  </div>
                  <div className="text-green-500 text-3xl font-bold">{stats.won}</div>
                  <div className="text-green-500/60 text-xs mt-1">+{stats.won * 10} pts</div>
                </div>

                {/* Perdus */}
                <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-xl p-5 hover:border-red-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                    </div>
                    <div className="text-red-400 text-xs font-medium uppercase tracking-wide">Perdus</div>
                  </div>
                  <div className="text-red-500 text-3xl font-bold">{stats.lost}</div>
                  <div className="text-red-500/60 text-xs mt-1">0 pts</div>
                </div>

                {/* En attente */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-xl p-5 hover:border-yellow-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Calendar className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="text-yellow-400 text-xs font-medium uppercase tracking-wide">En attente</div>
                  </div>
                  <div className="text-yellow-500 text-3xl font-bold">{stats.pending}</div>
                  <div className="text-yellow-500/60 text-xs mt-1">à venir</div>
                </div>

                {/* Win Rate */}
                <div className="bg-gradient-to-br from-[#5096ff]/10 to-[#5096ff]/5 border border-[#5096ff]/30 rounded-xl p-5 hover:border-[#5096ff]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#5096ff]/20 rounded-lg">
                      <Percent className="h-5 w-5 text-[#5096ff]" />
                    </div>
                    <div className="text-blue-400 text-xs font-medium uppercase tracking-wide">Win Rate</div>
                  </div>
                  <div className="text-[#5096ff] text-3xl font-bold">{stats.winRate}%</div>
                  <div className="text-[#5096ff]/60 text-xs mt-1">réussite</div>
                </div>

                {/* Points */}
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-xl p-5 hover:border-purple-500/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Award className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-purple-400 text-xs font-medium uppercase tracking-wide">Points</div>
                  </div>
                  <div className="text-purple-500 text-3xl font-bold">{stats.totalPoints}</div>
                  <div className="text-purple-500/60 text-xs mt-1">cumulés</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Filter className="h-5 w-5 text-zinc-400" />
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "ALL"
                    ? "bg-[#5096ff] text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setActiveFilter("PENDING")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "PENDING"
                    ? "bg-yellow-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                En attente
              </button>
              <button
                onClick={() => setActiveFilter("WON")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "WON"
                    ? "bg-green-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Gagnés
              </button>
              <button
                onClick={() => setActiveFilter("LOST")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === "LOST"
                    ? "bg-red-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Perdus
              </button>
            </div>

            {/* Predictions List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-zinc-800 rounded-full">
                    <Trophy className="h-12 w-12 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white mb-2">
                      {activeFilter === "ALL"
                        ? "Aucun prono encore"
                        : `Aucun prono ${activeFilter === "WON" ? "gagné" : activeFilter === "LOST" ? "perdu" : "en attente"}`
                      }
                    </p>
                    <p className="text-zinc-400 mb-6">
                      {activeFilter === "ALL"
                        ? "Commence à pronostiquer sur les matchs à venir"
                        : "Change de filtre pour voir tes autres pronos"
                      }
                    </p>
                  </div>
                  <Link
                    href="/matchs"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5096ff] to-[#5096ff]/80 hover:from-[#5096ff]/90 hover:to-[#5096ff]/70 text-white font-medium rounded-xl transition-all"
                  >
                    <Calendar className="h-5 w-5" />
                    Voir les matchs
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.keys(groupedPredictions)
                  .sort((a, b) => new Date(groupedPredictions[b][0].gameDate).getTime() - new Date(groupedPredictions[a][0].gameDate).getTime())
                  .map((date) => {
                    const isExpanded = expandedDates.has(date);
                    const datePredictions = groupedPredictions[date];

                    return (
                      <div key={date} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                        {/* Date Header - Collapsible */}
                        <button
                          onClick={() => toggleDate(date)}
                          className="w-full flex items-center justify-between px-6 py-4 bg-zinc-800/50 hover:bg-zinc-800/70 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-[#5096ff]" />
                            <h3 className="text-lg font-semibold text-white">{date}</h3>
                            <span className="text-sm text-zinc-400">
                              ({datePredictions.length} {datePredictions.length > 1 ? "pronos" : "prono"})
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-zinc-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-zinc-400" />
                          )}
                        </button>

                        {/* Predictions Grid - 2 Columns */}
                        {isExpanded && (
                          <div className="p-6 grid md:grid-cols-2 gap-6">
                            {datePredictions.map((pred) => (
                              pred.result === "PENDING" && pred.status === "SCHEDULED" ? (
                                <GameCard
                                  key={pred.id}
                                  game={pred.game}
                                  showScores={false}
                                  noSpoilEnabled={false}
                                />
                              ) : (
                                <PredictionCard key={pred.id} prediction={pred} />
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
