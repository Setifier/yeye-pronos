"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Archive, Calendar, ChevronRight, Crown, Loader2 } from "lucide-react";
import { Avatar } from "@/components/mobile/ui";
import { getSeasonLabel } from "@/types/season";

interface ArchivedSeason {
  season: string;
  totalGames: number;
  totalPredictions: number;
  players: number;
  champion: { name: string; image: string | null; points: number } | null;
}

/** Saisons passées : une carte par saison terminée (champion), qui ouvre ses classements (/archives/[saison]). */
export default function ArchivesPage() {
  const [seasons, setSeasons] = useState<ArchivedSeason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/archives")
      .then((r) => (r.ok ? r.json() : { seasons: [] }))
      .then((d: { seasons: ArchivedSeason[] }) => setSeasons(d.seasons ?? []))
      .catch(() => { /* liste vide */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
          <div className="flex flex-col items-center gap-3 mb-4">
            <Archive className="h-9 w-9 md:h-12 md:w-12 text-[#5096ff]" />
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-[#ff5050] via-[#5096ff] to-[#dcff50] bg-clip-text text-transparent">
                Saisons passées
              </span>
            </h1>
          </div>
          <p className="text-center text-zinc-400 text-sm md:text-lg">
            Les classements des pronos de chaque saison terminée
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {seasons.map((s) => (
              <Link
                key={s.season}
                href={`/archives/${s.season}`}
                className="group flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-[#5096ff]/50 active:scale-[0.99] md:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-white md:text-xl">Saison {getSeasonLabel(s.season)}</h2>
                  <ChevronRight className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-[#5096ff]" />
                </div>

                {s.champion ? (
                  <div className="flex items-center gap-3 rounded-xl border border-yellow-500/25 bg-gradient-to-r from-yellow-500/10 to-transparent p-3">
                    <span className="relative">
                      <Avatar name={s.champion.name} image={s.champion.image} size={44} />
                      <Crown className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 fill-yellow-400 text-yellow-400" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-yellow-400">Champion</span>
                      <span className="block truncate font-bold text-white">{s.champion.name}</span>
                      <span className="block text-xs font-semibold text-[#dcff50]">{s.champion.points.toLocaleString("fr-FR")} pts</span>
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Aucun joueur classé</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 md:text-sm">
                  <span>{s.players} joueur{s.players > 1 ? "s" : ""}</span>
                  <span>{s.totalPredictions} pronos</span>
                  <span>{s.totalGames} matchs</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
