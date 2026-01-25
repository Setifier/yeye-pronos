"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, BarChart3, ChevronDown, AlertTriangle, Loader2, X } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";
import {
  getTeamTimezone,
  getTimezoneAbbreviation,
} from "@/lib/nba-timezones";
import { BoxscoreModal } from "./boxscore-modal";
import { toast } from "sonner";

// Types
interface Team {
  id: number;
  dbId: string;
  name: string;
  full_name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface Game {
  id: number;
  dbId: string;
  date: string;
  dateUTC?: string;
  status: string;
  home_team: Team;
  visitor_team: Team;
  home_team_score?: number;
  visitor_team_score?: number;
  time?: string;
  currentPeriod?: number | null;
  gameClock?: string | null;
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
  injuryNote: string | null;
  pointsPerGame?: number;
  odds?: number;
}

interface PredictionData {
  predictedTeamId: string;
  predictedTeamName: string;
  predictedTeamAbbreviation: string;
  predictedScoreMargin: string | null;
  predictedTopScorerId: string | null;
  predictedTopScorer: {
    id: string;
    fullName: string;
    headshot: string | null;
    teamId: string;
  } | null;
}

interface GameCardProps {
  game: Game;
  showScores?: boolean;
  noSpoilEnabled?: boolean;
}

// Catégories d'écart de score
const SCORE_MARGINS = [
  { key: "OVERTIME", label: "Prolongation", shortLabel: "OT", description: "Le match va en prolongation" },
  { key: "SERRE", label: "Serré", shortLabel: "1-5", description: "Écart de 1 à 5 points" },
  { key: "CLASSIQUE", label: "Classique", shortLabel: "6-10", description: "Écart de 6 à 10 points" },
  { key: "FACILE", label: "Facile", shortLabel: "11-15", description: "Écart de 11 à 15 points" },
  { key: "LARGE", label: "Large", shortLabel: "16-20", description: "Écart de 16 à 20 points" },
  { key: "BLOWOUT", label: "Blowout", shortLabel: "21+", description: "Écart de 21 points ou plus" },
] as const;

export function GameCard({ game, showScores = false, noSpoilEnabled = false }: GameCardProps) {
  const [isBoxscoreModalOpen, setIsBoxscoreModalOpen] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBonusSection, setShowBonusSection] = useState(false);

  // Players for top scorer dropdown
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [activeTeamTab, setActiveTeamTab] = useState<"home" | "away">("away");
  const [isTopScorerDropdownOpen, setIsTopScorerDropdownOpen] = useState(false);

  const homeTeamLogo = getTeamLogo(game.home_team.abbreviation);
  const awayTeamLogo = getTeamLogo(game.visitor_team.abbreviation);

  const isLive = game.status === "FINAL" || game.status === "LIVE";
  const hasScores =
    game.home_team_score !== undefined &&
    game.visitor_team_score !== undefined &&
    game.home_team_score !== null &&
    game.visitor_team_score !== null;
  const shouldShowScores = showScores && hasScores && isLive;

  const gameDate = new Date(game.dateUTC || game.date);
  const isPastDeadline = gameDate.getTime() <= Date.now();
  const canPredict = !isLive && !isPastDeadline;
  const isFinal = game.status === "FINAL";

  // Charger le pronostic existant
  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const response = await fetch(`/api/predictions?gameId=${game.dbId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.prediction) {
            setPrediction(data.prediction);
            setShowBonusSection(true);
          }
        }
      } catch (error) {
        console.debug("Could not fetch prediction:", error);
      } finally {
        setIsLoadingPrediction(false);
      }
    };

    if (!isLive) {
      fetchPrediction();
    } else {
      setIsLoadingPrediction(false);
    }
  }, [game.dbId, isLive]);

  // Charger les joueurs quand on ouvre la section bonus
  useEffect(() => {
    if (showBonusSection && homePlayers.length === 0 && awayPlayers.length === 0) {
      fetchPlayers();
    }
  }, [showBonusSection]);

  const fetchPlayers = async () => {
    setIsLoadingPlayers(true);
    try {
      const response = await fetch(`/api/games/${game.dbId}/players`);
      if (response.ok) {
        const data = await response.json();
        setHomePlayers(data.homeTeam.players || []);
        setAwayPlayers(data.awayTeam.players || []);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  // Gérer le clic sur une équipe
  const handleTeamClick = async (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!canPredict || isSubmitting) return;

    // Si on clique sur l'équipe déjà sélectionnée = annuler
    if (prediction?.predictedTeamId === teamId) {
      await cancelPrediction();
      return;
    }

    // Sinon, créer/modifier le pronostic
    await submitPrediction(teamId);
  };

  const submitPrediction = async (
    teamId: string,
    scoreMargin?: string | null,
    topScorerId?: string | null
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.dbId,
          predictedTeamId: teamId,
          predictedScoreMargin: scoreMargin ?? prediction?.predictedScoreMargin,
          predictedTopScorerId: topScorerId ?? prediction?.predictedTopScorerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erreur lors du pronostic");
        return;
      }

      const data = await response.json();
      setPrediction(data.prediction);
      setShowBonusSection(true);

      // Message de succès discret
      if (!prediction) {
        toast.success("Pronostic enregistré !");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelPrediction = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/predictions?gameId=${game.dbId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de l'annulation");
        return;
      }

      setPrediction(null);
      setShowBonusSection(false);
      toast.success("Pronostic annulé");
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mettre à jour le bonus écart
  const handleMarginSelect = async (marginKey: string) => {
    if (!prediction || !canPredict) return;

    // Si même valeur = désélectionner
    const newMargin = prediction.predictedScoreMargin === marginKey ? null : marginKey;
    await submitPrediction(prediction.predictedTeamId, newMargin, prediction.predictedTopScorerId);
  };

  // Mettre à jour le top scorer
  const handleTopScorerSelect = async (playerId: string | null) => {
    if (!prediction || !canPredict) return;

    await submitPrediction(prediction.predictedTeamId, prediction.predictedScoreMargin, playerId);
    setIsTopScorerDropdownOpen(false);
  };

  // Formater les heures
  const formatGameTime = () => {
    if (!game.date) return { local: "TBD", paris: "", timezone: "", dateLabel: "" };

    try {
      const localDate = new Date(game.date);
      const homeTeamTimezone = getTeamTimezone(game.home_team.abbreviation);
      const timezoneAbbr = getTimezoneAbbreviation(homeTeamTimezone);

      const hours = localDate.getUTCHours();
      const minutes = localDate.getUTCMinutes();
      const isPM = hours >= 12;
      const displayHours = hours % 12 || 12;
      const localTime = `${displayHours}:${minutes.toString().padStart(2, "0")} ${isPM ? "PM" : "AM"}`;

      let parisTime = "";
      let dateLabel = "";
      if (game.dateUTC) {
        const utcDate = new Date(game.dateUTC);

        parisTime = utcDate.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        });

        const usDay = localDate.getUTCDate();
        const usMonth = localDate.getUTCMonth();
        const usYear = localDate.getUTCFullYear();

        const parisDateStr = utcDate.toLocaleDateString("fr-FR", {
          timeZone: "Europe/Paris",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const [parisDay, parisMonth, parisYear] = parisDateStr.split("/").map(Number);

        if (usDay !== parisDay || usMonth !== parisMonth - 1 || usYear !== parisYear) {
          dateLabel = utcDate.toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Paris",
          });
        }
      }

      return { local: localTime, paris: parisTime, timezone: timezoneAbbr, dateLabel };
    } catch (error) {
      return { local: game.time || "TBD", paris: "", timezone: "", dateLabel: "" };
    }
  };

  const gameTime = formatGameTime();

  // Clic sur la carte (pour matchs terminés)
  const handleCardClick = () => {
    if (isFinal) {
      setIsBoxscoreModalOpen(true);
    }
  };

  // Composant TeamBlock cliquable
  const TeamBlock = ({ team, isHome }: { team: Team; isHome: boolean }) => {
    const teamId = team.dbId;
    const isSelected = prediction?.predictedTeamId === teamId;
    const logo = isHome ? homeTeamLogo : awayTeamLogo;

    return (
      <button
        onClick={(e) => handleTeamClick(teamId, e)}
        disabled={!canPredict || isSubmitting}
        className={`
          flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200
          ${canPredict ? "cursor-pointer hover:bg-zinc-700/50" : "cursor-default"}
          ${isSelected
            ? "ring-2 ring-[#5096ff] bg-[#5096ff]/10"
            : "ring-1 ring-zinc-700/50 bg-zinc-800/30"
          }
          ${isSubmitting ? "opacity-50" : ""}
        `}
      >
        <div className="relative w-16 h-16 flex-shrink-0">
          {logo ? (
            <Image
              src={logo}
              alt={team.full_name}
              width={64}
              height={64}
              className="object-contain"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-600">
              <span className="text-zinc-300 text-sm font-bold">
                {team.abbreviation}
              </span>
            </div>
          )}
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#5096ff] rounded-full flex items-center justify-center shadow-lg shadow-[#5096ff]/30">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{team.name}</p>
          <p className="text-xs text-zinc-400">{team.abbreviation}</p>
        </div>
      </button>
    );
  };

  return (
    <div
      onClick={isFinal ? handleCardClick : undefined}
      className={`bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600/50 transition-all ${
        isFinal ? "cursor-pointer" : ""
      }`}
    >
      {/* Header: Time */}
      <div className="flex items-center justify-center p-4 border-b border-zinc-700/50">
        <div className="flex flex-col gap-0.5 items-center">
          {gameTime.dateLabel && (
            <span className="text-xs text-zinc-500 capitalize">
              {gameTime.dateLabel}
            </span>
          )}
          {gameTime.paris && (
            <span className="text-base font-bold text-white">
              {gameTime.paris}
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {gameTime.local} {gameTime.timezone && `(${gameTime.timezone})`}
          </span>
        </div>
      </div>

      {/* Teams Section */}
      <div className="p-4">
        {/* Live/Final Status */}
        {(game.status === "LIVE" || isFinal) && (
          <div className="flex items-center justify-center mb-4">
            {game.status === "LIVE" ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="text-xs font-bold text-red-500 uppercase">
                  {game.currentPeriod && game.gameClock
                    ? `Q${game.currentPeriod > 4 ? `OT${game.currentPeriod - 4}` : game.currentPeriod} ${game.gameClock}`
                    : "EN DIRECT"
                  }
                </span>
              </div>
            ) : shouldShowScores ? (
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-white">{game.visitor_team_score}</span>
                <span className="text-xs font-semibold text-zinc-400 uppercase px-2">FINAL</span>
                <span className="text-2xl font-bold text-white">{game.home_team_score}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-zinc-500 uppercase">TERMINÉ</span>
            )}
          </div>
        )}

        {/* Teams Grid */}
        <div className="flex items-center gap-4">
          <TeamBlock team={game.visitor_team} isHome={false} />
          <span className="text-zinc-500 text-lg font-bold">@</span>
          <TeamBlock team={game.home_team} isHome={true} />
        </div>

        {/* Loading indicator */}
        {isLoadingPrediction && (
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        )}

        {/* Call to action pour non-connectés ou pas encore voté */}
        {canPredict && !prediction && !isLoadingPrediction && (
          <p className="text-center text-sm text-zinc-500 mt-4">
            Cliquez sur une équipe pour pronostiquer
          </p>
        )}
      </div>

      {/* Bonus Section (slide-down) */}
      {showBonusSection && prediction && canPredict && (
        <div className="border-t border-zinc-700/50 bg-zinc-900/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs text-zinc-400 text-center uppercase tracking-wider">
            Bonus optionnels
          </p>

          {/* Score Margin Selector */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Écart de score prédit</p>
            <div className="grid grid-cols-3 gap-2">
              {SCORE_MARGINS.map((margin) => (
                <button
                  key={margin.key}
                  onClick={() => handleMarginSelect(margin.key)}
                  disabled={isSubmitting}
                  title={margin.description}
                  className={`
                    px-2 py-2 rounded-lg text-xs font-medium transition-all
                    ${prediction.predictedScoreMargin === margin.key
                      ? "bg-[#5096ff] text-white ring-2 ring-[#5096ff]/50"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }
                    ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="block font-bold">{margin.shortLabel}</span>
                  <span className="block text-[10px] opacity-75">{margin.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top Scorer Selector */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Top scorer du match</p>
            <button
              onClick={() => setIsTopScorerDropdownOpen(true)}
              disabled={isSubmitting || isLoadingPlayers}
              className={`
                w-full px-3 py-2 rounded-lg text-sm text-left transition-all
                flex items-center justify-between
                ${prediction.predictedTopScorer
                  ? "bg-[#5096ff]/20 text-white ring-1 ring-[#5096ff]/50"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }
                ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isLoadingPlayers ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </span>
              ) : prediction.predictedTopScorer ? (
                <span className="flex items-center gap-2">
                  {prediction.predictedTopScorer.headshot && (
                    <Image
                      src={prediction.predictedTopScorer.headshot}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  )}
                  {prediction.predictedTopScorer.fullName}
                  {(() => {
                    const selectedPlayer = [...homePlayers, ...awayPlayers].find(
                      (p) => p.id === prediction.predictedTopScorerId
                    );
                    return selectedPlayer?.odds !== undefined ? (
                      <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs font-bold text-[#5096ff]">
                        +{selectedPlayer.odds} pts
                      </span>
                    ) : null;
                  })()}
                </span>
              ) : (
                <span>Sélectionner un joueur</span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Scorer Modal */}
      {isTopScorerDropdownOpen && prediction && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setIsTopScorerDropdownOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">Top scorer du match</h3>
              <button
                onClick={() => setIsTopScorerDropdownOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-700">
              <button
                onClick={() => setActiveTeamTab("away")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTeamTab === "away"
                    ? "bg-zinc-800 text-white border-b-2 border-[#5096ff]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                {game.visitor_team.name}
              </button>
              <button
                onClick={() => setActiveTeamTab("home")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTeamTab === "home"
                    ? "bg-zinc-800 text-white border-b-2 border-[#5096ff]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                {game.home_team.name}
              </button>
            </div>

            {/* Clear selection */}
            {prediction.predictedTopScorer && (
              <button
                onClick={() => handleTopScorerSelect(null)}
                className="w-full px-4 py-3 text-sm text-red-400 hover:bg-zinc-800/50 text-left border-b border-zinc-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Retirer la sélection
              </button>
            )}

            {/* Players list */}
            <div className="max-h-80 overflow-y-auto">
              {isLoadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                </div>
              ) : (
                (activeTeamTab === "home" ? homePlayers : awayPlayers).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleTopScorerSelect(player.id)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors
                      flex items-center gap-3 border-b border-zinc-800/50
                      ${prediction.predictedTopScorerId === player.id ? "bg-[#5096ff]/20" : ""}
                    `}
                  >
                    {player.headshot ? (
                      <Image
                        src={player.headshot}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {player.jerseyNumber || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{player.fullName}</p>
                      <p className="text-xs text-zinc-500">
                        {player.pointsPerGame !== undefined ? `${player.pointsPerGame} pts/m` : player.position || "N/A"} {player.jerseyNumber && `• #${player.jerseyNumber}`}
                      </p>
                    </div>
                    {player.isInjured && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 rounded-full" title={player.injuryNote || "Blessé"}>
                        <AlertTriangle className="w-3 h-3 text-orange-400" />
                        <span className="text-xs text-orange-400">{player.injuryStatus}</span>
                      </div>
                    )}
                    {player.odds !== undefined && (
                      <div className="px-2 py-1 bg-zinc-700 rounded text-xs font-bold text-[#5096ff]">
                        +{player.odds} pts
                      </div>
                    )}
                    {prediction.predictedTopScorerId === player.id && (
                      <Check className="w-5 h-5 text-[#5096ff]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer for Final games */}
      {isFinal && (
        <div className="border-t border-zinc-700/50 p-3">
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <BarChart3 className="w-4 h-4" />
            <span>Voir les stats</span>
          </div>
        </div>
      )}

      {/* Boxscore Modal */}
      <BoxscoreModal
        isOpen={isBoxscoreModalOpen}
        onClose={() => setIsBoxscoreModalOpen(false)}
        gameId={game.dbId}
        noSpoilEnabled={noSpoilEnabled}
      />
    </div>
  );
}
