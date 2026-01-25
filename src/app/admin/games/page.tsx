"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  Filter,
  X,
  Calendar,
  Trophy,
  Target,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { refreshGameScoresAction } from "@/actions/admin/games";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
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
  predictions: number;
}

interface GamesResponse {
  success: boolean;
  games: Game[];
  total: number;
}

export default function GamesAdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Fetch games
  useEffect(() => {
    fetchGames();
  }, [statusFilter, dateFilter]);

  async function fetchGames() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (statusFilter) params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);

      const response = await fetch(`/api/admin/games?${params}`);
      const data: GamesResponse = await response.json();

      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      toast.error("Erreur lors du chargement des matchs");
    } finally {
      setIsLoading(false);
    }
  }

  const handleRefreshGame = async (gameId: string) => {
    setRefreshingId(gameId);
    const result = await refreshGameScoresAction({ gameId });
    setRefreshingId(null);

    if (result.success) {
      toast.success("Scores mis à jour");
      fetchGames();
    } else {
      toast.error(result.error || "Erreur lors de la mise à jour");
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setDateFilter("");
  };

  const hasActiveFilters = statusFilter || dateFilter;

  // Stats rapides
  const liveGames = games.filter((g) => g.status === "LIVE").length;
  const finalGames = games.filter((g) => g.status === "FINAL").length;
  const totalPredictions = games.reduce((sum, g) => sum + g.predictions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Monitoring des matchs</h1>
        <p className="text-zinc-400 mt-2">
          Surveillez les matchs et mettez à jour les scores manuellement
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-400">Total matchs</span>
          </div>
          <p className="text-2xl font-bold text-white">{games.length}</p>
        </div>

        <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-zinc-400">En direct</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{liveGames}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-green-400" />
            <span className="text-sm text-zinc-400">Terminés</span>
          </div>
          <p className="text-2xl font-bold text-white">{finalGames}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-zinc-400">Pronos totaux</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalPredictions}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Filtres</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtre par statut */}
          <div>
            <Label htmlFor="status" className="text-zinc-400">
              Statut
            </Label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="LIVE">En direct</option>
              <option value="FINAL">Terminés</option>
              <option value="SCHEDULED">À venir</option>
            </select>
          </div>

          {/* Filtre par date */}
          <div>
            <Label htmlFor="date" className="text-zinc-400">
              Date
            </Label>
            <input
              id="date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Liste des matchs */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-400">
              {hasActiveFilters
                ? "Aucun match ne correspond aux filtres"
                : "Aucun match trouvé"}
            </p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                {/* Status Badge */}
                <div>
                  {game.status === "LIVE" && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-medium">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      En direct
                    </span>
                  )}
                  {game.status === "FINAL" && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg font-medium">
                      Terminé
                    </span>
                  )}
                  {game.status === "SCHEDULED" && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg font-medium">
                      À venir
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Target className="w-4 h-4" />
                    <span>{game.predictions} prono{game.predictions > 1 ? "s" : ""}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefreshGame(game.id)}
                    disabled={refreshingId === game.id}
                  >
                    {refreshingId === game.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Rafraîchir
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Match Info */}
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Away Team */}
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {game.awayTeam.city} {game.awayTeam.name}
                  </p>
                  <p className="text-sm text-zinc-400">{game.awayTeam.abbreviation}</p>
                </div>

                {/* Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    {game.awayScore !== null ? game.awayScore : "-"}{" "}
                    <span className="text-zinc-600">-</span>{" "}
                    {game.homeScore !== null ? game.homeScore : "-"}
                  </div>
                </div>

                {/* Home Team */}
                <div className="text-left">
                  <p className="text-lg font-semibold text-white">
                    {game.homeTeam.city} {game.homeTeam.name}
                  </p>
                  <p className="text-sm text-zinc-400">{game.homeTeam.abbreviation}</p>
                </div>
              </div>

              {/* Date */}
              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 text-sm text-zinc-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDistanceToNow(new Date(game.gameDate), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
