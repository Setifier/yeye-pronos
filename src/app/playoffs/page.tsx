"use client";

import { useState, useEffect } from "react";
import { Loader2, Swords } from "lucide-react";
import { PlayoffsNavbar } from "@/components/layout/playoffs-navbar";
import { useViewedSeason } from "@/components/archives/season-context";
import {
  Series, PlayInData,
  DesktopBracket, MobileBracket, SeriesModal, PlayInSection, SpoilGate,
} from "@/components/playoffs/bracket-display";
import { Eye, EyeOff } from "lucide-react";

export default function PlayoffsPage() {
  // Saison en cours, ou saison passée dans /archives/[saison]/…
  const viewed = useViewedSeason();
  const [bracket, setBracket]   = useState<Series[]>([]);
  const [season, setSeason]     = useState<string>("");
  const [playIn, setPlayIn]     = useState<PlayInData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [noSpoil, setNoSpoil]   = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [bracketRes, playInRes] = await Promise.all([
          fetch(`/api/playoffs/bracket?season=${viewed}`),
          fetch(`/api/playoffs/playin?season=${viewed}`),
        ]);
        if (!bracketRes.ok) throw new Error("Failed to fetch bracket");
        const bracketData = await bracketRes.json();
        setBracket(bracketData.bracket ?? []);
        setSeason(bracketData.season ?? "");
        if (playInRes.ok) {
          const piData: PlayInData = await playInRes.json();
          if (piData.west || piData.east) setPlayIn(piData);
        }
      } catch (err) {
        setError("Impossible de charger le bracket.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [viewed]);

  const handleToggleNoSpoil = () => {
    setNoSpoil((v) => {
      if (!v) setSelectedSeries(null);
      return !v;
    });
  };

  const hasData = bracket.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      <PlayoffsNavbar />
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Playoffs NBA</h1>
              {season && <p className="text-sm text-zinc-500 mt-0.5">Saison {season}</p>}
            </div>
            <button
              onClick={handleToggleNoSpoil}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${
                noSpoil
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
            >
              {noSpoil ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{noSpoil ? "No spoil actif" : "No spoil"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-600" />
            <p className="text-zinc-500">Chargement du bracket...</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Swords className="w-12 h-12 text-zinc-700" />
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}
        {!loading && !error && !hasData && !playIn && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-5 bg-zinc-800/50 rounded-2xl"><Swords className="w-14 h-14 text-zinc-600" /></div>
            <p className="text-zinc-300 text-lg font-semibold">Les playoffs n&apos;ont pas encore commencé</p>
            <p className="text-zinc-600 text-sm">Les séries apparaîtront ici dès le début des playoffs.</p>
          </div>
        )}
        {!loading && !error && (hasData || !!playIn) && (
          <div className="relative">
            <div className={noSpoil ? "blur-sm pointer-events-none select-none" : ""}>
              {hasData && (
                <>
                  <div className="hidden lg:block">
                    <DesktopBracket bracket={bracket} onSeriesClick={setSelectedSeries} />
                  </div>
                  <div className="lg:hidden">
                    <MobileBracket bracket={bracket} onSeriesClick={setSelectedSeries} />
                  </div>
                </>
              )}
              {playIn && <PlayInSection data={playIn} bracket={bracket} onSeriesClick={setSelectedSeries} />}
            </div>
            {noSpoil && <SpoilGate onReveal={() => setNoSpoil(false)} />}
          </div>
        )}
      </div>

      {selectedSeries && <SeriesModal series={selectedSeries} onClose={() => setSelectedSeries(null)} />}
    </div>
  );
}
