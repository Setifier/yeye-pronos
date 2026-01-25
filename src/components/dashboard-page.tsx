"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, Loader2 } from "lucide-react";
import { StatsCards } from "./dashboard/stats-cards";
import { RecentPredictionsList } from "./dashboard/recent-predictions-list";
import { MiniLeaderboard } from "./dashboard/mini-leaderboard";
import { CompactGameCard } from "./dashboard/compact-game-card";
import { UserBadgesDisplay } from "./user-badges-display";
import type {
  UserStats,
  RecentPrediction,
  LeaderboardData,
} from "@/lib/dashboard-queries";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string | null;
}

interface Game {
  id: string;
  gameDate: string;
  localGameDate: string;
  status: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  userPrediction?: {
    predictedTeamId: string;
  } | null;
}

interface DashboardPageProps {
  userId: string;
  userName: string;
  userCreatedAt: Date;
  userImage: string | null;
}

export function DashboardPage({ userId, userName, userCreatedAt, userImage }: DashboardPageProps) {
  // Formater la date d'inscription
  const joinedDate = new Date(userCreatedAt);
  const joinedMonth = joinedDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<
    RecentPrediction[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [todaysGames, setTodaysGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [noSpoilEnabled, setNoSpoilEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [badgesData, setBadgesData] = useState<any>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [statsRes, predictionsRes, leaderboardRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/recent-predictions?limit=10"),
          fetch("/api/dashboard/leaderboard"),
        ]);

        // Check for errors
        if (!statsRes.ok || !predictionsRes.ok || !leaderboardRes.ok) {
          throw new Error("Erreur lors du chargement des données");
        }

        // Parse responses
        const [statsData, predictionsData, leaderboardData] = await Promise.all(
          [statsRes.json(), predictionsRes.json(), leaderboardRes.json()]
        );

        // Set states
        setStats(statsData.stats);
        setRecentPredictions(predictionsData.predictions);
        setLeaderboard({
          topUsers: leaderboardData.topUsers,
          currentUser: leaderboardData.currentUser,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "Erreur inconnue"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]);

  // Fetch badges data
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setBadgesLoading(true);
        const response = await fetch(`/api/users/${userId}/badges`);
        if (!response.ok) throw new Error("Erreur lors du chargement des badges");
        const data = await response.json();
        setBadgesData(data);
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setBadgesLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  // Fetch today's games with polling for live updates
  useEffect(() => {
    const fetchTodaysGames = async () => {
      try {
        setGamesLoading(true);
        const today = new Date();
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const response = await fetch(`/api/games?date=${dateString}`);
        if (!response.ok) throw new Error("Erreur lors du chargement des matchs");

        const data = await response.json();

        // Mapper les données de l'API (snake_case) vers notre format (camelCase)
        const mappedGames = (data.games || [])
          .filter((game: any) => game.home_team && game.visitor_team) // Filtrer les matchs invalides
          .map(mapGameData);

        setTodaysGames(mappedGames);
      } catch (error) {
        console.error("Error fetching today's games:", error);
      } finally {
        setGamesLoading(false);
      }
    };

    // Fetch initial data
    fetchTodaysGames();

    // Set up polling every 60 seconds for live updates
    const interval = setInterval(fetchTodaysGames, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load no-spoil preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("noSpoilEnabled");
    if (saved !== null) {
      setNoSpoilEnabled(saved === "true");
    }
  }, []);

  // Helper function to map API data to component format
  const mapGameData = (game: any) => ({
    id: game.dbId || game.id,
    gameDate: game.dateUTC || game.date,
    localGameDate: game.date,
    status: game.status,
    homeTeam: {
      id: game.home_team?.dbId,
      name: game.home_team?.name,
      abbreviation: game.home_team?.abbreviation,
      logoUrl: game.home_team?.logoUrl || null,
    },
    awayTeam: {
      id: game.visitor_team?.dbId,
      name: game.visitor_team?.name,
      abbreviation: game.visitor_team?.abbreviation,
      logoUrl: game.visitor_team?.logoUrl || null,
    },
    homeScore: game.home_team_score,
    awayScore: game.visitor_team_score,
    userPrediction: game.userPrediction || null,
  });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Erreur de chargement
          </h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#5096ff] hover:bg-[#5096ff]/90 text-white font-medium rounded-xl transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar avec lien vers le profil */}
              <Link
                href="/profile"
                className="flex-shrink-0 group relative"
              >
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-700 group-hover:border-[#5096ff] transition-all"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5096ff] to-[#ff5050] flex items-center justify-center border-2 border-zinc-700 group-hover:border-[#5096ff] transition-all">
                    <span className="text-2xl font-bold text-white">
                      {userName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white font-medium">Profil</span>
                </div>
              </Link>

              {/* Texte de bienvenue */}
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Tableau de Bord
                </h1>
                <p className="text-lg text-zinc-400 mb-1">
                  Bienvenue, <span className="text-white">{userName}</span> 👋
                </p>
                <p className="text-sm text-zinc-500">
                  Inscrit depuis {joinedMonth}
                </p>
              </div>
            </div>
            <Link
              href="/matchs"
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-[#5096ff] hover:bg-[#5096ff]/90 text-white font-medium rounded-xl transition-all"
            >
              <Calendar className="h-5 w-5" />
              Voir tous les matchs
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <section className="mb-8">
          <StatsCards stats={stats} />
        </section>

        {/* Grid: Main + Sidebar */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Today's Games */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Matchs du Jour
                </h2>
                <Link
                  href="/matchs"
                  className="flex items-center gap-2 text-sm font-medium text-[#5096ff] transition-colors hover:text-[#5096ff]/80"
                >
                  Voir tout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {gamesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
                </div>
              ) : todaysGames.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                  <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">Aucun match prévu aujourd'hui</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaysGames.slice(0, 6).map((game) => (
                    <CompactGameCard
                      key={game.id}
                      game={game}
                      showScores={!noSpoilEnabled}
                      onPredictionSuccess={() => {
                        // Refetch games to update user predictions
                        const today = new Date();
                        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                        fetch(`/api/games?date=${dateString}`)
                          .then(res => res.json())
                          .then(data => {
                            const mappedGames = (data.games || [])
                              .filter((game: any) => game.home_team && game.visitor_team)
                              .map(mapGameData);
                            setTodaysGames(mappedGames);
                          });
                      }}
                    />
                  ))}
                </div>
              )}

              {todaysGames.length > 6 && (
                <Link
                  href="/matchs"
                  className="mt-4 block text-center py-3 rounded-lg border border-zinc-800 text-[#5096ff] hover:bg-zinc-800/50 transition-all"
                >
                  Voir les {todaysGames.length - 6} autres matchs →
                </Link>
              )}
            </section>

            {/* Recent Predictions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Derniers Pronos
                </h2>
              </div>
              <RecentPredictionsList predictions={recentPredictions} />
            </section>

            {/* Badges Section */}
            {badgesLoading ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
                </div>
              </div>
            ) : (
              badgesData && (
                <section>
                  <UserBadgesDisplay
                    badges={badgesData.badges}
                    stats={badgesData.stats}
                    variant="compact"
                    maxDisplay={6}
                  />
                </section>
              )
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <MiniLeaderboard leaderboard={leaderboard} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 animate-pulse">
      {/* Header Skeleton */}
      <section className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-10 w-64 bg-zinc-800 rounded mb-2" />
          <div className="h-6 w-48 bg-zinc-800 rounded" />
        </div>
      </section>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900 rounded-xl" />
          ))}
        </div>

        {/* Grid Skeleton */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-8">
            <div className="h-48 bg-zinc-900 rounded-xl" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-zinc-900 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="h-96 bg-zinc-900 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
