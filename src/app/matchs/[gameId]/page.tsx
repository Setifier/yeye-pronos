"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trophy, Clock } from "lucide-react";
import Link from "next/link";

interface Player {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string | null;
  jerseyNumber: string | null;
}

interface PlayerStats {
  player: Player;
  stats: {
    minutes: string | null;
    points: number;
    rebounds: number | null;
    assists: number | null;
    steals: number | null;
    blocks: number | null;
    turnovers: number | null;
    fieldGoals: string;
    threePointers: string;
    freeThrows: string;
    plusMinus: number | null;
  };
}

interface TeamBoxscore {
  team: {
    id: string;
    name: string;
    city: string;
    abbreviation: string;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  players: PlayerStats[];
  totals: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
  };
}

interface BoxscoreData {
  game: {
    id: string;
    status: string;
    gameDate: string;
    homeTeam: any;
    awayTeam: any;
    homeScore: number | null;
    awayScore: number | null;
    hasOvertime: boolean;
    scoreMarginCategory: string | null;
    topScorer: { id: string; fullName: string } | null;
    topScorerPoints: number | null;
  };
  boxscore: {
    homeTeam: TeamBoxscore;
    awayTeam: TeamBoxscore;
  } | null;
  message?: string;
}

export default function BoxscorePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [data, setData] = useState<BoxscoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"away" | "home">("away");

  useEffect(() => {
    if (!gameId) return;

    const fetchBoxscore = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/boxscore`);
        if (!response.ok) throw new Error("Erreur");

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoxscore();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
      </div>
    );
  }

  if (!data || !data.boxscore) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/matchs"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux matchs
          </Link>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-400">{data?.message || "Boxscore non disponible"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { game, boxscore } = data;
  const activeTeam = activeTab === "home" ? boxscore.homeTeam : boxscore.awayTeam;

  // Formater la date du match pour le lien de retour
  const gameDate = new Date(game.gameDate);
  const gameDateStr = gameDate.toISOString().split('T')[0]; // Format YYYY-MM-DD

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          href={`/matchs?date=${gameDateStr}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux matchs
        </Link>

        {/* Game Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            {/* Away Team */}
            <div className="flex items-center gap-4">
              {game.awayTeam.logoUrl && (
                <img src={game.awayTeam.logoUrl} alt={game.awayTeam.abbreviation} className="h-16 w-16" />
              )}
              <div>
                <p className="text-2xl font-bold">{game.awayTeam.city} {game.awayTeam.name}</p>
                <p className="text-sm text-zinc-400">{game.awayTeam.abbreviation}</p>
              </div>
            </div>

            {/* Score */}
            <div className="text-center px-6">
              <div className="flex items-center gap-4 text-4xl font-bold">
                <span className={game.awayScore! > game.homeScore! ? "text-green-500" : ""}>{game.awayScore}</span>
                <span className="text-zinc-600">-</span>
                <span className={game.homeScore! > game.awayScore! ? "text-green-500" : ""}>{game.homeScore}</span>
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                {game.status === "FINAL" ? "Terminé" : game.status}
                {game.hasOvertime && " (OT)"}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(game.gameDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Home Team */}
            <div className="flex items-center gap-4 flex-row-reverse">
              {game.homeTeam.logoUrl && (
                <img src={game.homeTeam.logoUrl} alt={game.homeTeam.abbreviation} className="h-16 w-16" />
              )}
              <div className="text-right">
                <p className="text-2xl font-bold">{game.homeTeam.city} {game.homeTeam.name}</p>
                <p className="text-sm text-zinc-400">{game.homeTeam.abbreviation}</p>
              </div>
            </div>
          </div>

          {/* Top Scorer */}
          {game.topScorer && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>Top scorer: <strong className="text-zinc-200">{game.topScorer.fullName}</strong> avec {game.topScorerPoints} points</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("away")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
              activeTab === "away"
                ? "bg-[#5096ff] text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {game.awayTeam.abbreviation}
          </button>
          <button
            onClick={() => setActiveTab("home")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
              activeTab === "home"
                ? "bg-[#5096ff] text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {game.homeTeam.abbreviation}
          </button>
        </div>

        {/* Stats Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left sticky left-0 bg-zinc-800 z-10">Joueur</th>
                  <th className="px-3 py-3 text-center">MIN</th>
                  <th className="px-3 py-3 text-center">PTS</th>
                  <th className="px-3 py-3 text-center">REB</th>
                  <th className="px-3 py-3 text-center">AST</th>
                  <th className="px-3 py-3 text-center">STL</th>
                  <th className="px-3 py-3 text-center">BLK</th>
                  <th className="px-3 py-3 text-center">TO</th>
                  <th className="px-3 py-3 text-center">FG</th>
                  <th className="px-3 py-3 text-center">3PT</th>
                  <th className="px-3 py-3 text-center">FT</th>
                  <th className="px-3 py-3 text-center">+/-</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {activeTeam.players.map((playerStat) => (
                  <tr key={playerStat.player.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3 sticky left-0 bg-zinc-900 z-10">
                      <Link
                        href={`/joueurs/${playerStat.player.id}`}
                        className="hover:text-[#5096ff] transition flex items-center gap-2"
                      >
                        <span className="font-medium">{playerStat.player.fullName}</span>
                        {playerStat.player.jerseyNumber && (
                          <span className="text-xs text-zinc-500">#{playerStat.player.jerseyNumber}</span>
                        )}
                        {playerStat.player.position && (
                          <span className="text-xs text-zinc-500">{playerStat.player.position}</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-300">{playerStat.stats.minutes || "-"}</td>
                    <td className="px-3 py-3 text-center font-bold">{playerStat.stats.points}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.rebounds ?? "-"}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.assists ?? "-"}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.steals ?? "-"}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.blocks ?? "-"}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.turnovers ?? "-"}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.fieldGoals}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.threePointers}</td>
                    <td className="px-3 py-3 text-center">{playerStat.stats.freeThrows}</td>
                    <td className={`px-3 py-3 text-center ${
                      (playerStat.stats.plusMinus ?? 0) > 0 ? "text-green-500" :
                      (playerStat.stats.plusMinus ?? 0) < 0 ? "text-red-500" : ""
                    }`}>
                      {playerStat.stats.plusMinus !== null ? (playerStat.stats.plusMinus > 0 ? "+" : "") + playerStat.stats.plusMinus : "-"}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="border-t-2 border-zinc-700 font-bold bg-zinc-800/50">
                  <td className="px-4 py-3 sticky left-0 bg-zinc-800 z-10">TOTAUX</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">{activeTeam.totals.points}</td>
                  <td className="px-3 py-3 text-center">{activeTeam.totals.rebounds}</td>
                  <td className="px-3 py-3 text-center">{activeTeam.totals.assists}</td>
                  <td className="px-3 py-3 text-center">{activeTeam.totals.steals}</td>
                  <td className="px-3 py-3 text-center">{activeTeam.totals.blocks}</td>
                  <td className="px-3 py-3 text-center">{activeTeam.totals.turnovers}</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
