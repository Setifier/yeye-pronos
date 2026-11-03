"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, ChevronLeft, X } from "lucide-react";

interface Player {
  id: string;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
  headshot: string | null;
  team: {
    id: string;
    name: string;
    abbreviation: string;
    logoUrl: string;
  } | null;
}

interface PlayerSelectionStepProps {
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Étape 3: Sélection du joueur favori
 *
 * Recherche avec autocomplete (debounced 300ms)
 * Affiche les résultats avec logo équipe, nom, position
 */
export function PlayerSelectionStep({
  selectedPlayerId,
  onSelect,
  onNext,
  onBack,
}: PlayerSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/players/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();

        if (data.success) {
          setResults(data.players);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("Error searching players:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    onSelect(player.id);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedPlayer(null);
    onSelect("");
  };

  const handleNext = () => {
    if (!selectedPlayerId) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <Search className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Qui est votre joueur favori ?
        </h2>
        <p className="text-zinc-400">
          Recherchez et sélectionnez votre joueur NBA préféré
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un joueur (min. 2 caractères)..."
            className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown Results */}
        {showDropdown && results.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
            {results.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player)}
                className="w-full flex items-center gap-4 p-4 hover:bg-zinc-700 transition-colors text-left"
              >
                {/* Player Headshot or Team Logo */}
                <div className="w-12 h-12 flex-shrink-0">
                  {player.headshot ? (
                    <Image
                      src={player.headshot}
                      alt={player.fullName}
                      width={48}
                      height={48}
                      className="rounded-full object-cover border-2 border-zinc-600"
                    />
                  ) : player.team ? (
                    <Image
                      src={player.team.logoUrl}
                      alt={player.team.abbreviation}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {player.fullName[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <p className="text-white font-semibold">{player.fullName}</p>
                  <p className="text-sm text-zinc-400">
                    {player.position && `${player.position} • `}
                    {player.team?.abbreviation}
                    {player.jerseyNumber && ` • #${player.jerseyNumber}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {showDropdown && results.length === 0 && !isSearching && (
          <div className="absolute z-10 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4">
            <p className="text-zinc-400 text-center">
              Aucun joueur trouvé pour &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Selected Player Display */}
      {selectedPlayer && (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Player Headshot or Team Logo */}
              <div className="w-16 h-16 flex-shrink-0">
                {selectedPlayer.headshot ? (
                  <Image
                    src={selectedPlayer.headshot}
                    alt={selectedPlayer.fullName}
                    width={64}
                    height={64}
                    className="rounded-full object-cover border-2 border-blue-500"
                  />
                ) : selectedPlayer.team ? (
                  <Image
                    src={selectedPlayer.team.logoUrl}
                    alt={selectedPlayer.team.abbreviation}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {selectedPlayer.fullName[0]}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-zinc-400 mb-1">Joueur sélectionné</p>
                <p className="text-white font-bold text-lg">
                  {selectedPlayer.fullName}
                </p>
                <p className="text-sm text-zinc-400">
                  {selectedPlayer.position && `${selectedPlayer.position} • `}
                  {selectedPlayer.team?.name}
                  {selectedPlayer.jerseyNumber && ` • #${selectedPlayer.jerseyNumber}`}
                </p>
              </div>
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClearSelection}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <p className="text-sm text-zinc-400">
          💡 Utilisez la barre de recherche pour trouver votre joueur favori
          parmi tous les joueurs NBA actifs.
        </p>
      </div>

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
          disabled={!selectedPlayerId}
          className={`flex-1 py-4 rounded-xl font-semibold transition-all ${
            selectedPlayerId
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
