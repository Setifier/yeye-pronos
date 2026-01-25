"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getTeamLogo } from "@/lib/nba-logos";
import { toast } from "sonner";
import {
  ScoreMarginCategory,
  SCORE_MARGIN_LABELS,
  SCORE_MARGIN_ICONS,
  BONUS_POINTS,
} from "@/types/bonus";

// ============================================
// TYPES
// ============================================

interface Team {
  id: string | number;
  name: string;
  full_name: string;
  abbreviation: string;
  city: string;
}

interface Player {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string | null;
  jerseyNumber: string | null;
  headshot: string | null;
  isInjured: boolean;
  injuryStatus: string | null;
  team: {
    id: string;
    name: string;
    abbreviation: string;
  } | null;
  pointsPerGame: number;
  gamesPlayed: number;
  odds: number;
}

interface ExistingPrediction {
  predictedTeamId: string;
  predictedTeamName: string;
  predictedScoreMargin?: string | null;
  predictedTopScorerId?: string | null;
}

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string | number;
  homeTeam: Team;
  awayTeam: Team;
  existingPrediction?: ExistingPrediction | null;
  onSuccess?: () => void;
}

// ============================================
// CONSTANTES
// ============================================

const STEPS = {
  TEAM: 1,
  MARGIN: 2,
  TOP_SCORER: 3,
} as const;

const MARGIN_OPTIONS = [
  ScoreMarginCategory.OVERTIME,
  ScoreMarginCategory.MATCH_SERRE,
  ScoreMarginCategory.UN_CLASSIQUE,
  ScoreMarginCategory.MATCH_EASY,
  ScoreMarginCategory.TROP_FORT,
  ScoreMarginCategory.BLOW_OUT,
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function PredictionModal({
  isOpen,
  onClose,
  gameId,
  homeTeam,
  awayTeam,
  existingPrediction,
  onSuccess,
}: PredictionModalProps) {
  // États
  const [step, setStep] = useState(STEPS.TEAM);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    existingPrediction?.predictedTeamId || null
  );
  const [selectedMargin, setSelectedMargin] = useState<ScoreMarginCategory | null>(
    (existingPrediction?.predictedScoreMargin as ScoreMarginCategory) || null
  );
  const [selectedTopScorer, setSelectedTopScorer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<{ home: Player[]; away: Player[] }>({
    home: [],
    away: [],
  });
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const homeTeamLogo = getTeamLogo(homeTeam.abbreviation);
  const awayTeamLogo = getTeamLogo(awayTeam.abbreviation);

  // Charger les joueurs quand on arrive à l'étape 3
  useEffect(() => {
    if (step === STEPS.TOP_SCORER && players.home.length === 0) {
      loadPlayers();
    }
  }, [step]);

  // Reset quand le modal s'ouvre/ferme
  useEffect(() => {
    if (isOpen) {
      setStep(STEPS.TEAM);
      setSelectedTeamId(existingPrediction?.predictedTeamId || null);
      setSelectedMargin(
        (existingPrediction?.predictedScoreMargin as ScoreMarginCategory) || null
      );
      setSelectedTopScorer(null);
      setSearchQuery("");
    }
  }, [isOpen, existingPrediction]);

  // Charger les joueurs depuis l'API
  const loadPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const response = await fetch(`/api/games/${gameId}/players`);
      const data = await response.json();

      if (data.success) {
        setPlayers({
          home: data.players.home,
          away: data.players.away,
        });

        // Si un top scorer était déjà sélectionné, le retrouver
        if (existingPrediction?.predictedTopScorerId) {
          const allPlayers = [...data.players.home, ...data.players.away];
          const existing = allPlayers.find(
            (p: Player) => p.id === existingPrediction.predictedTopScorerId
          );
          if (existing) {
            setSelectedTopScorer(existing);
          }
        }
      }
    } catch (error) {
      console.error("Erreur chargement joueurs:", error);
      toast.error("Erreur lors du chargement des joueurs");
    } finally {
      setLoadingPlayers(false);
    }
  };

  // Soumettre le pronostic
  const handleSubmit = async () => {
    if (!selectedTeamId) {
      toast.error("Veuillez sélectionner une équipe");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: String(gameId),
          predictedTeamId: selectedTeamId,
          predictedScoreMargin: selectedMargin || null,
          predictedTopScorerId: selectedTopScorer?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }

      toast.success("Pronostic enregistré !");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error submitting prediction:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'enregistrement"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation entre étapes
  const goToNextStep = () => {
    if (step < STEPS.TOP_SCORER) {
      setStep(step + 1);
    }
  };

  const goToPrevStep = () => {
    if (step > STEPS.TEAM) {
      setStep(step - 1);
    }
  };

  // Filtrer les joueurs par recherche
  const filteredPlayers = {
    home: players.home.filter((p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    away: players.away.filter((p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  };

  // Calculer les points potentiels
  const calculatePotentialPoints = () => {
    let points = BONUS_POINTS.BASE; // 10 pts base
    if (selectedMargin) points += BONUS_POINTS.MARGIN_EXACT; // +10 pts
    if (selectedTopScorer) points += selectedTopScorer.odds; // +cote
    // Combo si tout est sélectionné
    if (selectedTeamId && selectedMargin && selectedTopScorer) {
      points += BONUS_POINTS.COMBO_PERFECT; // +20 pts
    }
    return points;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header avec étapes */}
          <div className="p-4 border-b border-zinc-700 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">
                {existingPrediction ? "Modifier" : "Faire"} votre pronostic
              </h2>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2">
              {[STEPS.TEAM, STEPS.MARGIN, STEPS.TOP_SCORER].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step >= s
                        ? "bg-[#5096ff] text-white"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        step > s ? "bg-[#5096ff]" : "bg-zinc-700"
                      }`}
                    />
                  )}
                </div>
              ))}
              <div className="ml-auto text-xs text-zinc-500">
                {step === STEPS.TEAM && "Vainqueur"}
                {step === STEPS.MARGIN && "Ecart"}
                {step === STEPS.TOP_SCORER && "Top Scorer"}
              </div>
            </div>
          </div>

          {/* Content - scrollable */}
          <div className="p-4 overflow-y-auto flex-1">
            {/* ÉTAPE 1: Sélection équipe */}
            {step === STEPS.TEAM && (
              <div>
                <p className="text-sm text-zinc-400 mb-4 text-center">
                  Qui va gagner ce match ? <span className="text-[#5096ff]">(+{BONUS_POINTS.BASE} pts)</span>
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Away Team */}
                  <button
                    onClick={() => setSelectedTeamId(String(awayTeam.id))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTeamId === String(awayTeam.id)
                        ? "border-[#5096ff] bg-[#5096ff]/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        {awayTeamLogo ? (
                          <Image
                            src={awayTeamLogo}
                            alt={awayTeam.full_name}
                            width={56}
                            height={56}
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-zinc-700 rounded-full flex items-center justify-center">
                            <span className="text-zinc-300 text-xs font-bold">
                              {awayTeam.abbreviation}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">{awayTeam.city}</p>
                        <p className="text-xs text-zinc-400">{awayTeam.name}</p>
                      </div>
                    </div>
                  </button>

                  {/* Home Team */}
                  <button
                    onClick={() => setSelectedTeamId(String(homeTeam.id))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTeamId === String(homeTeam.id)
                        ? "border-[#5096ff] bg-[#5096ff]/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        {homeTeamLogo ? (
                          <Image
                            src={homeTeamLogo}
                            alt={homeTeam.full_name}
                            width={56}
                            height={56}
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-zinc-700 rounded-full flex items-center justify-center">
                            <span className="text-zinc-300 text-xs font-bold">
                              {homeTeam.abbreviation}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">{homeTeam.city}</p>
                        <p className="text-xs text-zinc-400">{homeTeam.name}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2: Sélection écart */}
            {step === STEPS.MARGIN && (
              <div>
                <p className="text-sm text-zinc-400 mb-4 text-center">
                  Quel sera l'écart de score ? <span className="text-[#5096ff]">(+{BONUS_POINTS.MARGIN_EXACT} pts)</span>
                  <br />
                  <span className="text-xs text-zinc-500">(optionnel)</span>
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {MARGIN_OPTIONS.map((margin) => (
                    <button
                      key={margin}
                      onClick={() =>
                        setSelectedMargin(selectedMargin === margin ? null : margin)
                      }
                      className={`p-3 rounded-lg border transition-all text-left ${
                        selectedMargin === margin
                          ? "border-[#5096ff] bg-[#5096ff]/10"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{SCORE_MARGIN_ICONS[margin]}</span>
                        <span className="text-sm text-white">
                          {SCORE_MARGIN_LABELS[margin]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedMargin(null)}
                  className="mt-3 w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Passer cette étape
                </button>
              </div>
            )}

            {/* ÉTAPE 3: Sélection top scorer */}
            {step === STEPS.TOP_SCORER && (
              <div>
                <p className="text-sm text-zinc-400 mb-3 text-center">
                  Qui sera le meilleur scoreur du match ?
                  <br />
                  <span className="text-xs text-zinc-500">(optionnel - points selon la cote)</span>
                </p>

                {/* Barre de recherche */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Rechercher un joueur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#5096ff]"
                  />
                </div>

                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-[#5096ff] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {/* Away Team Players */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 sticky top-0 bg-zinc-900 py-1">
                        {awayTeam.name}
                      </p>
                      <div className="space-y-1">
                        {filteredPlayers.away.map((player) => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            isSelected={selectedTopScorer?.id === player.id}
                            onClick={() =>
                              setSelectedTopScorer(
                                selectedTopScorer?.id === player.id ? null : player
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Home Team Players */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 sticky top-0 bg-zinc-900 py-1">
                        {homeTeam.name}
                      </p>
                      <div className="space-y-1">
                        {filteredPlayers.home.map((player) => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            isSelected={selectedTopScorer?.id === player.id}
                            onClick={() =>
                              setSelectedTopScorer(
                                selectedTopScorer?.id === player.id ? null : player
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSelectedTopScorer(null)}
                  className="mt-3 w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Passer cette étape
                </button>
              </div>
            )}
          </div>

          {/* Footer avec résumé et navigation */}
          <div className="p-4 border-t border-zinc-700 shrink-0">
            {/* Résumé des points potentiels */}
            <div className="mb-3 p-2 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Points potentiels :</span>
                <span className="text-[#5096ff] font-bold">
                  {selectedTeamId ? calculatePotentialPoints() : 0} pts
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                {selectedTeamId && <span>Victoire: {BONUS_POINTS.BASE}pts</span>}
                {selectedMargin && <span>+ Ecart: {BONUS_POINTS.MARGIN_EXACT}pts</span>}
                {selectedTopScorer && <span>+ Scorer: {selectedTopScorer.odds}pts</span>}
                {selectedTeamId && selectedMargin && selectedTopScorer && (
                  <span>+ Combo: {BONUS_POINTS.COMBO_PERFECT}pts</span>
                )}
              </div>
            </div>

            {/* Boutons de navigation */}
            <div className="flex gap-3">
              {step > STEPS.TEAM ? (
                <button
                  onClick={goToPrevStep}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Retour
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Annuler
                </button>
              )}

              {step < STEPS.TOP_SCORER ? (
                <button
                  onClick={goToNextStep}
                  disabled={!selectedTeamId}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#5096ff] to-[#5096ff]/80 hover:from-[#5096ff]/90 hover:to-[#5096ff]/70 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedTeamId || isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#5096ff] to-[#5096ff]/80 hover:from-[#5096ff]/90 hover:to-[#5096ff]/70 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Enregistrement..." : "Valider"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// COMPOSANT PLAYER CARD
// ============================================

function PlayerCard({
  player,
  isSelected,
  onClick,
}: {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2 rounded-lg border transition-all flex items-center gap-3 ${
        isSelected
          ? "border-[#5096ff] bg-[#5096ff]/10"
          : "border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600"
      }`}
    >
      {/* Photo */}
      <div className="relative w-10 h-10 shrink-0">
        {player.headshot ? (
          <Image
            src={player.headshot}
            alt={player.fullName}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-zinc-400 text-xs">
              {player.firstName?.[0]}
              {player.lastName?.[0]}
            </span>
          </div>
        )}
        {player.isInjured && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[8px]">!</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm text-white truncate">{player.fullName}</p>
        <p className="text-xs text-zinc-500">
          {player.pointsPerGame} pts/match
          {player.isInjured && (
            <span className="text-red-400 ml-1">({player.injuryStatus})</span>
          )}
        </p>
      </div>

      {/* Cote */}
      <div className="shrink-0 px-2 py-1 bg-zinc-700 rounded text-xs font-bold text-[#5096ff]">
        +{player.odds} pts
      </div>
    </button>
  );
}
