"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, Circle, Check } from "lucide-react";
import { toast } from "sonner";
import { getTeamLogo } from "@/lib/nba-logos";

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

interface CompactGameCardProps {
  game: Game;
  showScores: boolean;
  onPredictionSuccess?: () => void;
}

export function CompactGameCard({
  game,
  showScores,
  onPredictionSuccess,
}: CompactGameCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = () => {
    if (!game.gameDate) return { paris: "TBD" };

    try {
      const utcDate = new Date(game.gameDate);

      // Heure de Paris
      const parisTime = utcDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });

      return { paris: parisTime };
    } catch (error) {
      console.error("Error formatting time:", error);
      return { paris: "TBD" };
    }
  };

  const handlePrediction = async (teamId: string) => {
    // Si on clique sur l'équipe déjà sélectionnée, ne rien faire
    if (game.userPrediction?.predictedTeamId === teamId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          predictedTeamId: teamId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création du prono");
      }

      const message = game.userPrediction ? "Prono modifié !" : "Prono enregistré !";
      toast.success(message);
      onPredictionSuccess?.();
    } catch (error) {
      console.error("Error creating prediction:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la création du prono"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vérifications de sécurité
  if (!game.homeTeam || !game.awayTeam) {
    console.error("Invalid game data:", game);
    return null;
  }

  const isLive = game.status === "LIVE";
  const isFinal = game.status === "FINAL";
  const isScheduled = game.status === "SCHEDULED";

  // Vérifier la deadline : on ne peut plus pronostiquer une fois le match commencé
  const gameDate = new Date(game.gameDate);
  const isPastDeadline = gameDate.getTime() <= Date.now();
  const canPredict = !isLive && !isFinal && !isPastDeadline;

  const gameTime = formatTime();
  const homeTeamLogo = getTeamLogo(game.homeTeam.abbreviation);
  const awayTeamLogo = getTeamLogo(game.awayTeam.abbreviation);

  const hasScores = game.homeScore !== null && game.awayScore !== null;
  const shouldShowScores = showScores && hasScores && (isLive || isFinal);

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:bg-zinc-800/70 hover:border-[#5096ff]/30 transition-all">
      {/* Header: Time & Status */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-700/50">
        {/* Time */}
        <div className="flex items-center gap-2">
          {isScheduled && (
            <>
              <Clock className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-semibold text-white">
                {gameTime.paris}
              </span>
            </>
          )}
          {isFinal && (
            <span className="text-xs font-semibold text-zinc-400 uppercase px-2 py-1 bg-zinc-700/50 rounded">
              TERMINÉ
            </span>
          )}
        </div>

        {/* Live Badge */}
        {isLive && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-500 rounded-md text-xs font-semibold animate-pulse">
            <Circle className="h-2 w-2 fill-red-500" />
            EN DIRECT
          </span>
        )}
      </div>

      {/* Teams - Horizontal Layout */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Away Team */}
        <button
          onClick={() => handlePrediction(game.awayTeam.id)}
          disabled={isSubmitting || !canPredict}
          className={`flex items-center gap-2 flex-1 p-2 rounded-lg transition-all ${
            game.userPrediction?.predictedTeamId === game.awayTeam.id
              ? "bg-[#5096ff]/20 border-2 border-[#5096ff]"
              : canPredict ? "hover:bg-zinc-700/50 border-2 border-transparent" : "border-2 border-transparent"
          } ${isSubmitting || !canPredict ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <div className="relative w-10 h-10 flex-shrink-0">
            {awayTeamLogo ? (
              <Image
                src={awayTeamLogo}
                alt={game.awayTeam.name}
                width={40}
                height={40}
                className="object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-600">
                <span className="text-zinc-300 text-xs font-bold">
                  {game.awayTeam.abbreviation}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white truncate">
              {game.awayTeam.name}
            </p>
            <p className="text-xs text-zinc-400">{game.awayTeam.abbreviation}</p>
          </div>
          {shouldShowScores && (
            <p className="text-lg font-bold text-white ml-2">
              {game.awayScore}
            </p>
          )}
        </button>

        {/* VS / @ / Score */}
        <div className="flex items-center justify-center flex-shrink-0 px-2">
          {shouldShowScores && isFinal ? (
            <span className="text-xs font-semibold text-zinc-400 uppercase">
              FINAL
            </span>
          ) : (
            <span className="text-zinc-500 text-sm font-bold">@</span>
          )}
        </div>

        {/* Home Team */}
        <button
          onClick={() => handlePrediction(game.homeTeam.id)}
          disabled={isSubmitting || !canPredict}
          className={`flex items-center gap-2 flex-1 p-2 rounded-lg transition-all ${
            game.userPrediction?.predictedTeamId === game.homeTeam.id
              ? "bg-[#5096ff]/20 border-2 border-[#5096ff]"
              : canPredict ? "hover:bg-zinc-700/50 border-2 border-transparent" : "border-2 border-transparent"
          } ${isSubmitting || !canPredict ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          {shouldShowScores && (
            <p className="text-lg font-bold text-white mr-2">
              {game.homeScore}
            </p>
          )}
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs font-semibold text-white truncate">
              {game.homeTeam.name}
            </p>
            <p className="text-xs text-zinc-400">{game.homeTeam.abbreviation}</p>
          </div>
          <div className="relative w-10 h-10 flex-shrink-0">
            {homeTeamLogo ? (
              <Image
                src={homeTeamLogo}
                alt={game.homeTeam.name}
                width={40}
                height={40}
                className="object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-600">
                <span className="text-zinc-300 text-xs font-bold">
                  {game.homeTeam.abbreviation}
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* User Prediction Indicator */}
      {canPredict && game.userPrediction && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 pt-2 border-t border-zinc-700/50">
          <Check className="h-3.5 w-3.5 text-[#5096ff]" />
          <span>Cliquez sur une équipe pour modifier</span>
        </div>
      )}
    </div>
  );
}
