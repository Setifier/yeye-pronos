"use client";

import Image from "next/image";
import { CheckCircle2, XCircle, Clock, Trophy, TrendingDown } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
}

interface Prediction {
  id: string;
  gameId: string;
  gameDate: string;
  localGameDate: string;
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

interface PredictionCardProps {
  prediction: Prediction;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const homeTeamLogo = getTeamLogo(prediction.homeTeam.abbreviation);
  const awayTeamLogo = getTeamLogo(prediction.awayTeam.abbreviation);

  const isWon = prediction.result === "WON";
  const isLost = prediction.result === "LOST";
  const isPending = prediction.result === "PENDING";
  const isFinal = prediction.status === "FINAL";

  const formatGameTime = () => {
    const date = new Date(prediction.gameDate);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div
      className={`bg-zinc-800/50 border rounded-xl p-6 transition-all ${
        isWon
          ? "border-green-500/30 hover:border-green-500/50"
          : isLost
          ? "border-red-500/30 hover:border-red-500/50"
          : "border-zinc-700/50 hover:border-[#5096ff]/30"
      }`}
    >
      {/* Header: Result Badge Centered */}
      <div className="flex items-center justify-center mb-6 pb-4 border-b border-zinc-700/50">
        {isWon && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg border border-green-500/30">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-semibold">Gagné</span>
            <div className="ml-2 px-2 py-0.5 bg-green-500/30 rounded text-xs font-bold">
              +{prediction.pointsEarned}pts
            </div>
          </div>
        )}

        {isLost && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg border border-red-500/30">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Perdu</span>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-500 rounded-lg border border-yellow-500/30">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">En attente</span>
          </div>
        )}
      </div>

      {/* Teams - Horizontal Layout */}
      <div className="flex items-center justify-between gap-4">
        {/* Away Team */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-16 h-16 flex-shrink-0">
            {awayTeamLogo ? (
              <Image
                src={awayTeamLogo}
                alt={prediction.awayTeam.name}
                width={64}
                height={64}
                className="object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-600">
                <span className="text-zinc-300 text-sm font-bold">
                  {prediction.awayTeam.abbreviation}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {prediction.predictedTeam.id === prediction.awayTeam.id && (
                <Trophy className="h-4 w-4 text-[#5096ff]" />
              )}
              <p className={`text-sm font-semibold truncate ${
                prediction.predictedTeam.id === prediction.awayTeam.id
                  ? "text-[#5096ff]"
                  : "text-white"
              }`}>
                {prediction.awayTeam.name}
              </p>
            </div>
            <p className="text-xs text-zinc-400">{prediction.awayTeam.abbreviation}</p>
          </div>
        </div>

        {/* Score Centered */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0 min-w-[120px]">
          {isFinal && prediction.homeScore !== null && prediction.awayScore !== null ? (
            <>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-white">
                  {prediction.awayScore}
                </span>
                <span className="text-zinc-600 text-lg font-bold">-</span>
                <span className="text-3xl font-bold text-white">
                  {prediction.homeScore}
                </span>
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase">
                FINAL
              </span>
            </>
          ) : (
            <span className="text-zinc-500 text-sm font-bold">@</span>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <p className={`text-sm font-semibold truncate ${
                prediction.predictedTeam.id === prediction.homeTeam.id
                  ? "text-[#5096ff]"
                  : "text-white"
              }`}>
                {prediction.homeTeam.name}
              </p>
              {prediction.predictedTeam.id === prediction.homeTeam.id && (
                <Trophy className="h-4 w-4 text-[#5096ff]" />
              )}
            </div>
            <p className="text-xs text-zinc-400">{prediction.homeTeam.abbreviation}</p>
          </div>
          <div className="relative w-16 h-16 flex-shrink-0">
            {homeTeamLogo ? (
              <Image
                src={homeTeamLogo}
                alt={prediction.homeTeam.name}
                width={64}
                height={64}
                className="object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-600">
                <span className="text-zinc-300 text-sm font-bold">
                  {prediction.homeTeam.abbreviation}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prediction Info */}
      <div className="mt-6 pt-4 border-t border-zinc-700/50 flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          Ton prono : <span className="text-[#5096ff] font-semibold">{prediction.predictedTeam.abbreviation}</span>
        </div>

        {isFinal && (
          <div className="text-sm text-zinc-500">
            {isWon ? (
              <span className="text-green-500 font-medium">✓ Prono correct</span>
            ) : (
              <span className="text-red-500 font-medium">✗ Prono incorrect</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
