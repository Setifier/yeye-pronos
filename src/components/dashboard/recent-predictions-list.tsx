"use client";

import { Check, X, Clock } from "lucide-react";
import type { RecentPrediction } from "@/lib/dashboard-queries";
import { getTeamLogo } from "@/lib/nba-logos";

interface RecentPredictionsListProps {
  predictions: RecentPrediction[];
}

export function RecentPredictionsList({
  predictions,
}: RecentPredictionsListProps) {
  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">Aucun pronostic pour le moment</p>
        <p className="mt-2 text-sm text-zinc-500">
          Commencez par pronostiquer sur les matchs du jour !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {predictions.map((prediction) => (
        <PredictionCard key={prediction.id} prediction={prediction} />
      ))}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: RecentPrediction }) {
  const homeLogoUrl = getTeamLogo(prediction.homeTeam.abbreviation);
  const awayLogoUrl = getTeamLogo(prediction.awayTeam.abbreviation);

  // Déterminer le statut du résultat
  const resultBadge = {
    WON: {
      bg: "bg-green-500/20",
      text: "text-green-500",
      border: "border-green-500/30",
      icon: Check,
      label: "Gagné",
    },
    LOST: {
      bg: "bg-red-500/20",
      text: "text-red-500",
      border: "border-red-500/30",
      icon: X,
      label: "Perdu",
    },
    PENDING: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-500",
      border: "border-yellow-500/30",
      icon: Clock,
      label: "En attente",
    },
  };

  const badge = resultBadge[prediction.result as keyof typeof resultBadge] || resultBadge.PENDING;
  const Icon = badge.icon;

  // Déterminer quelle équipe a été prédite
  const isPredictedAway =
    prediction.predictedTeam.abbreviation === prediction.awayTeam.abbreviation;
  const isPredictedHome =
    prediction.predictedTeam.abbreviation === prediction.homeTeam.abbreviation;

  // Formatter la date et l'heure
  const gameDate = new Date(prediction.gameDate);
  const formattedDate = gameDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const formattedTime = gameDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-6">
        {/* Date et heure - Gauche */}
        <div className="flex flex-col items-start min-w-[80px]">
          <span className="text-sm font-medium text-zinc-400">
            {formattedDate}
          </span>
          <span className="text-xs text-zinc-500">{formattedTime}</span>
        </div>

        {/* Match - Centre */}
        <div className="flex flex-1 items-center justify-center gap-4">
          {/* Away Team (Extérieur) */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                isPredictedAway
                  ? "bg-[#5096ff]/20 border-2 border-[#5096ff] scale-105"
                  : "border border-transparent"
              }`}
            >
              {awayLogoUrl && (
                <img
                  src={awayLogoUrl}
                  alt={prediction.awayTeam.name}
                  className="h-8 w-8 object-contain"
                />
              )}
              <span
                className={`text-sm font-semibold ${
                  isPredictedAway ? "text-white" : "text-zinc-300"
                }`}
              >
                {prediction.awayTeam.abbreviation}
              </span>
            </div>
            {prediction.finalScore.away !== null && (
              <span className="text-lg font-bold text-zinc-400">
                {prediction.finalScore.away}
              </span>
            )}
          </div>

          {/* Séparateur @ */}
          <span className="text-zinc-600 font-medium">@</span>

          {/* Home Team (Domicile) */}
          <div className="flex items-center gap-3">
            {prediction.finalScore.home !== null && (
              <span className="text-lg font-bold text-zinc-400">
                {prediction.finalScore.home}
              </span>
            )}
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                isPredictedHome
                  ? "bg-[#5096ff]/20 border-2 border-[#5096ff] scale-105"
                  : "border border-transparent"
              }`}
            >
              {homeLogoUrl && (
                <img
                  src={homeLogoUrl}
                  alt={prediction.homeTeam.name}
                  className="h-8 w-8 object-contain"
                />
              )}
              <span
                className={`text-sm font-semibold ${
                  isPredictedHome ? "text-white" : "text-zinc-300"
                }`}
              >
                {prediction.homeTeam.abbreviation}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge - Droite */}
        <div className="flex items-center min-w-[120px] justify-end">
          <div
            className={`flex items-center gap-2 rounded-lg border ${badge.border} ${badge.bg} px-3 py-1.5`}
          >
            <Icon className={`h-4 w-4 ${badge.text}`} />
            <div className="flex flex-col items-start">
              <span className={`text-xs font-medium ${badge.text}`}>
                {badge.label}
              </span>
              {prediction.result !== "PENDING" && (
                <span className={`text-xs ${badge.text}`}>
                  {prediction.pointsEarned > 0
                    ? `+${prediction.pointsEarned} pts`
                    : "0 pt"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
