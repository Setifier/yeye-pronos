"use client";

import { useState, useEffect } from "react";
import { GameCard } from "@/components/game-card";
import { DateNavigation } from "@/components/date-navigation";
import { NoSpoilToggle } from "@/components/no-spoil-toggle";
import { Loader2 } from "lucide-react";

interface Team {
  id: number;
  name: string;
  full_name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
}

interface Game {
  id: number;
  date: string;
  status: string;
  home_team: Team;
  visitor_team: Team;
  home_team_score?: number;
  visitor_team_score?: number;
  time?: string;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noSpoilEnabled, setNoSpoilEnabled] = useState(true);

  // Charger la préférence No Spoil depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("noSpoilEnabled");
    if (saved !== null) {
      setNoSpoilEnabled(saved === "true");
    }
  }, []);

  // Sauvegarder la préférence No Spoil
  const handleNoSpoilToggle = (enabled: boolean) => {
    setNoSpoilEnabled(enabled);
    localStorage.setItem("noSpoilEnabled", String(enabled));
  };

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      setError(null);

      try {
        // Formater la date en YYYY-MM-DD SANS conversion UTC
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;

        const response = await fetch(`/api/games?date=${dateString}`);

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des matchs");
        }

        const data = await response.json();
        setGames(data.games || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [selectedDate]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Logo + NBA */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <img
              src="/logo.png"
              alt="Yeye Pronos"
              className="h-16 md:h-20 w-auto"
            />
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-[#ff5050] via-[#5096ff] to-[#dcff50] bg-clip-text text-transparent">
                Matchs NBA
              </span>
            </h1>
          </div>
          <p className="text-center text-zinc-400 text-lg">
            Pronostiquez les résultats des matchs NBA et grimpez dans le
            classement
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-zinc-950 border-b border-zinc-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto">
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
      </div>

      {/* No Spoil Toggle */}
      <div className="bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
          <NoSpoilToggle
            enabled={noSpoilEnabled}
            onToggle={handleNoSpoilToggle}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#5096ff]" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg">
              Aucun match prévu pour cette date
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                showScores={!noSpoilEnabled}
                noSpoilEnabled={noSpoilEnabled}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
