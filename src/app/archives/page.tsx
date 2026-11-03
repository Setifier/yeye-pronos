"use client";

import { useState, useEffect } from "react";
import { Archive, Trophy, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";

interface ArchivedSeason {
  season: string;
  totalGames: number;
  totalPredictions: number;
}

export default function ArchivesPage() {
  const [seasons, setSeasons] = useState<ArchivedSeason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedSeasons();
  }, []);

  const fetchArchivedSeasons = async () => {
    try {
      const response = await fetch("/api/archives");
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons);
      }
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center gap-3 mb-4">
            <Archive className="h-12 w-12 text-[#5096ff]" />
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-[#ff5050] via-[#5096ff] to-[#dcff50] bg-clip-text text-transparent">
                Archives
              </span>
            </h1>
          </div>
          <p className="text-center text-zinc-400 text-lg">
            Consultez les saisons passées dans leur intégralité
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#5096ff]" />
          </div>
        ) : seasons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-zinc-400 text-lg font-medium">
                Aucune saison archivée actuellement
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Les saisons passées apparaîtront ici une fois terminées.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasons.map((season) => (
              <Link
                key={season.season}
                href={`/archives/${season.season}`}
                className="group p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#5096ff]/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="h-6 w-6 text-[#dcff50]" />
                  <h2 className="text-xl font-bold text-white">
                    Saison {season.season}
                  </h2>
                </div>
                <div className="flex gap-4 text-sm text-zinc-400">
                  <span>{season.totalGames} matchs</span>
                  <span>{season.totalPredictions} pronos</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
