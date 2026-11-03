"use client";

import { useState } from "react";
import { Trophy, ChevronLeft } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";

interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  logoUrl: string | null;
  conference: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

interface TeamSelectionStepProps {
  teams: Team[];
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type ConferenceFilter = "ALL" | "EAST" | "WEST";

/**
 * Étape 2: Sélection de l'équipe favorite
 *
 * Affiche toutes les équipes avec filtres par conférence
 * Grid responsive avec logos et abréviations
 */
export function TeamSelectionStep({
  teams,
  selectedTeamId,
  onSelect,
  onNext,
  onBack,
}: TeamSelectionStepProps) {
  const [filter, setFilter] = useState<ConferenceFilter>("ALL");

  const filteredTeams = teams.filter((team) => {
    if (filter === "ALL") return true;
    return team.conference === filter;
  });

  const handleNext = () => {
    if (!selectedTeamId) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Quelle est votre équipe favorite ?
        </h2>
        <p className="text-zinc-400">
          Sélectionnez l&apos;équipe NBA que vous supportez
        </p>
      </div>

      {/* Conference Filters */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${
            filter === "ALL"
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter("EAST")}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${
            filter === "EAST"
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Est
        </button>
        <button
          onClick={() => setFilter("WEST")}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${
            filter === "WEST"
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Ouest
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-2">
        {filteredTeams.map((team) => {
          const isSelected = team.id === selectedTeamId;

          const primaryColor = team.primaryColor || "#5096ff";
          const secondaryColor = team.secondaryColor || "#8b5cf6";

          return (
            <button
              key={team.id}
              onClick={() => onSelect(team.id)}
              style={
                isSelected
                  ? {
                      borderColor: primaryColor,
                      background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`,
                    }
                  : undefined
              }
              className={`relative p-4 rounded-xl transition-all duration-300 ${
                isSelected
                  ? "border-2 scale-105 shadow-lg"
                  : "bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-600 hover:scale-105"
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}

              {/* Team Logo */}
              <div className="flex flex-col items-center gap-3">
                <img
                  src={team.logoUrl ?? getTeamLogo(team.abbreviation)}
                  alt={`${team.city} ${team.name}`}
                  className="w-16 h-16 object-contain"
                />
                <div className="text-center">
                  <p className="font-bold text-white text-sm">
                    {team.abbreviation}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {team.city}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Team Display */}
      {selectedTeamId && (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-2">Équipe sélectionnée</p>
          <div className="flex items-center gap-3">
            {(() => {
              const selected = teams.find((t) => t.id === selectedTeamId);
              return (
                <>
                  <img
                    src={selected ? selected.logoUrl ?? getTeamLogo(selected.abbreviation) : undefined}
                    alt={selected?.name}
                    className="w-10 h-10"
                  />
                  <div>
                    <p className="text-white font-semibold">
                      {selected?.city} {selected?.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Conférence {selected?.conference === "EAST" ? "Est" : "Ouest"}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedTeamId}
          className={`flex-1 py-4 rounded-xl font-semibold transition-all ${
            selectedTeamId
              ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
