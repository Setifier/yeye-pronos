"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Trophy, EyeOff } from "lucide-react";
import Link from "next/link";

// Fonction pour calculer si un match est un DD ou TD
function calculateDoubles(stats: {
  points: number;
  rebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
}): { isDoubleDouble: boolean; isTripleDouble: boolean } {
  const categories = [
    stats.points,
    stats.rebounds ?? 0,
    stats.assists ?? 0,
    stats.steals ?? 0,
    stats.blocks ?? 0,
  ];

  const doubleDigitCount = categories.filter((val) => val >= 10).length;

  return {
    isDoubleDouble: doubleDigitCount >= 2,
    isTripleDouble: doubleDigitCount >= 3,
  };
}

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

interface BoxscoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string | number;
  noSpoilEnabled?: boolean;
}

export function BoxscoreModal({ isOpen, onClose, gameId, noSpoilEnabled = false }: BoxscoreModalProps) {
  const [data, setData] = useState<BoxscoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"away" | "home">("away");
  const [spoilRevealed, setSpoilRevealed] = useState(false);

  // Block scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      // Reset spoil reveal when closing
      setSpoilRevealed(false);
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !gameId) return;

    const fetchBoxscore = async () => {
      setLoading(true);
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
  }, [gameId, isOpen]);

  if (!isOpen) return null;

  const activeTeam = data?.boxscore
    ? activeTab === "home"
      ? data.boxscore.homeTeam
      : data.boxscore.awayTeam
    : null;

  const shouldHideScores = noSpoilEnabled && !spoilRevealed;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-7xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl m-4">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10 rounded-t-2xl">
            <h2 className="text-xl font-bold text-white">Statistiques du match</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
            </div>
          ) : !data || !data.boxscore ? (
            <div className="p-8 text-center">
              <p className="text-zinc-400">
                {data?.message || "Boxscore non disponible"}
              </p>
            </div>
          ) : shouldHideScores ? (
            <div className="p-8 flex flex-col items-center justify-center gap-6 py-20">
              <div className="flex items-center gap-3 text-zinc-400">
                <EyeOff className="h-8 w-8" />
                <p className="text-lg">Mode No Spoil activé</p>
              </div>
              <p className="text-sm text-zinc-500 text-center max-w-md">
                Les scores et statistiques sont masqués pour préserver le suspense.
                <br />
                Cliquez sur le bouton ci-dessous pour les révéler.
              </p>
              <button
                onClick={() => setSpoilRevealed(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#5096ff] to-[#5096ff]/80 hover:from-[#5096ff]/90 hover:to-[#5096ff]/70 text-white font-medium rounded-lg transition-all"
              >
                Afficher les statistiques
              </button>
            </div>
          ) : (
            <div className="p-6">
              {/* Game Header */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  {/* Away Team */}
                  <div className="flex items-center gap-4">
                    {data.game.awayTeam.logoUrl && (
                      <img
                        src={data.game.awayTeam.logoUrl}
                        alt={data.game.awayTeam.abbreviation}
                        className="h-16 w-16"
                      />
                    )}
                    <div>
                      <p className="text-2xl font-bold">
                        {data.game.awayTeam.city} {data.game.awayTeam.name}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {data.game.awayTeam.abbreviation}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center px-6">
                    <div className="flex items-center gap-4 text-4xl font-bold">
                      <span
                        className={
                          data.game.awayScore! > data.game.homeScore!
                            ? "text-green-500"
                            : ""
                        }
                      >
                        {data.game.awayScore}
                      </span>
                      <span className="text-zinc-600">-</span>
                      <span
                        className={
                          data.game.homeScore! > data.game.awayScore!
                            ? "text-green-500"
                            : ""
                        }
                      >
                        {data.game.homeScore}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-2">
                      {data.game.status === "FINAL" ? "Terminé" : data.game.status}
                      {data.game.hasOvertime && " (OT)"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(data.game.gameDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center gap-4 flex-row-reverse">
                    {data.game.homeTeam.logoUrl && (
                      <img
                        src={data.game.homeTeam.logoUrl}
                        alt={data.game.homeTeam.abbreviation}
                        className="h-16 w-16"
                      />
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {data.game.homeTeam.city} {data.game.homeTeam.name}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {data.game.homeTeam.abbreviation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top Scorer */}
                {data.game.topScorer && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-center gap-2 text-sm text-zinc-400">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span>
                      Top scorer:{" "}
                      <strong className="text-zinc-200">
                        {data.game.topScorer.fullName}
                      </strong>{" "}
                      avec {data.game.topScorerPoints} points
                    </span>
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
                  {data.game.awayTeam.abbreviation}
                </button>
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                    activeTab === "home"
                      ? "bg-[#5096ff] text-white"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {data.game.homeTeam.abbreviation}
                </button>
              </div>

              {/* Stats Table */}
              {activeTeam && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-800 text-xs text-zinc-400 uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left sticky left-0 bg-zinc-800 z-10">
                            Joueur
                          </th>
                          <th className="px-3 py-3 text-center">MIN</th>
                          <th className="px-3 py-3 text-center">PTS</th>
                          <th className="px-3 py-3 text-center">REB</th>
                          <th className="px-3 py-3 text-center">AST</th>
                          <th className="px-3 py-3 text-center">STL</th>
                          <th className="px-3 py-3 text-center">BLK</th>
                          <th className="px-3 py-3 text-center">TO</th>
                          <th className="px-3 py-3 text-center">FG</th>
                          <th className="px-3 py-3 text-center">FG%</th>
                          <th className="px-3 py-3 text-center">3PT</th>
                          <th className="px-3 py-3 text-center">3PT%</th>
                          <th className="px-3 py-3 text-center">FT</th>
                          <th className="px-3 py-3 text-center">+/-</th>
                          <th className="px-3 py-3 text-center">DD/TD</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {activeTeam.players.map((playerStat) => {
                          const { isDoubleDouble, isTripleDouble } = calculateDoubles({
                            points: playerStat.stats.points,
                            rebounds: playerStat.stats.rebounds,
                            assists: playerStat.stats.assists,
                            steals: playerStat.stats.steals,
                            blocks: playerStat.stats.blocks,
                          });

                          return (
                          <tr
                            key={playerStat.player.id}
                            className="border-t border-zinc-800 hover:bg-zinc-800/50"
                          >
                            <td className="px-4 py-3 sticky left-0 bg-zinc-900 z-10">
                              <Link
                                href={`/joueurs/${playerStat.player.id}`}
                                onClick={onClose}
                                className="hover:text-[#5096ff] transition flex items-center gap-2"
                              >
                                <span className="font-medium">
                                  {playerStat.player.fullName}
                                </span>
                                {playerStat.player.jerseyNumber && (
                                  <span className="text-xs text-zinc-500">
                                    #{playerStat.player.jerseyNumber}
                                  </span>
                                )}
                                {playerStat.player.position && (
                                  <span className="text-xs text-zinc-500">
                                    {playerStat.player.position}
                                  </span>
                                )}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-center text-zinc-300">
                              {playerStat.stats.minutes || "-"}
                            </td>
                            <td className="px-3 py-3 text-center font-bold">
                              {playerStat.stats.points}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {playerStat.stats.rebounds ?? "-"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {playerStat.stats.assists ?? "-"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {playerStat.stats.steals ?? "-"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {playerStat.stats.blocks ?? "-"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {playerStat.stats.turnovers ?? "-"}
                            </td>
                            {(() => {
                              // Calculer les pourcentages
                              const fgParts = playerStat.stats.fieldGoals.split("/");
                              const threeParts = playerStat.stats.threePointers.split("/");
                              const fgMade = parseInt(fgParts[0]) || 0;
                              const fgAttempted = parseInt(fgParts[1]) || 0;
                              const threeMade = parseInt(threeParts[0]) || 0;
                              const threeAttempted = parseInt(threeParts[1]) || 0;
                              const fgPct = fgAttempted > 0 ? ((fgMade / fgAttempted) * 100).toFixed(0) : "-";
                              const threePct = threeAttempted > 0 ? ((threeMade / threeAttempted) * 100).toFixed(0) : "-";
                              return (
                                <>
                                  <td className="px-3 py-3 text-center">
                                    {playerStat.stats.fieldGoals}
                                  </td>
                                  <td className="px-3 py-3 text-center text-zinc-400">
                                    {fgPct !== "-" ? `${fgPct}%` : "-"}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {playerStat.stats.threePointers}
                                  </td>
                                  <td className="px-3 py-3 text-center text-zinc-400">
                                    {threePct !== "-" ? `${threePct}%` : "-"}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {playerStat.stats.freeThrows}
                                  </td>
                                </>
                              );
                            })()}
                            <td
                              className={`px-3 py-3 text-center ${
                                (playerStat.stats.plusMinus ?? 0) > 0
                                  ? "text-green-500"
                                  : (playerStat.stats.plusMinus ?? 0) < 0
                                  ? "text-red-500"
                                  : ""
                              }`}
                            >
                              {playerStat.stats.plusMinus !== null
                                ? (playerStat.stats.plusMinus > 0 ? "+" : "") +
                                  playerStat.stats.plusMinus
                                : "-"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {isTripleDouble ? (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">
                                  TD
                                </span>
                              ) : isDoubleDouble ? (
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                                  DD
                                </span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                          </tr>
                        );})}
                        {/* Totals Row */}
                        {(() => {
                          // Calculer les totaux de tirs
                          let totalFGMade = 0, totalFGAttempted = 0;
                          let total3PMade = 0, total3PAttempted = 0;
                          let totalFTMade = 0, totalFTAttempted = 0;
                          let ddCount = 0, tdCount = 0;

                          activeTeam.players.forEach((playerStat) => {
                            // Parse FG, 3PT, FT strings (format: "made/attempted")
                            const fgParts = playerStat.stats.fieldGoals.split("/");
                            const threeParts = playerStat.stats.threePointers.split("/");
                            const ftParts = playerStat.stats.freeThrows.split("/");

                            totalFGMade += parseInt(fgParts[0]) || 0;
                            totalFGAttempted += parseInt(fgParts[1]) || 0;
                            total3PMade += parseInt(threeParts[0]) || 0;
                            total3PAttempted += parseInt(threeParts[1]) || 0;
                            totalFTMade += parseInt(ftParts[0]) || 0;
                            totalFTAttempted += parseInt(ftParts[1]) || 0;

                            // Count DD/TD
                            const { isDoubleDouble, isTripleDouble } = calculateDoubles({
                              points: playerStat.stats.points,
                              rebounds: playerStat.stats.rebounds,
                              assists: playerStat.stats.assists,
                              steals: playerStat.stats.steals,
                              blocks: playerStat.stats.blocks,
                            });
                            if (isTripleDouble) tdCount++;
                            else if (isDoubleDouble) ddCount++;
                          });

                          return (
                            <tr className="border-t-2 border-zinc-700 font-bold bg-zinc-800/50">
                              <td className="px-4 py-3 sticky left-0 bg-zinc-800 z-10">
                                TOTAUX
                              </td>
                              <td className="px-3 py-3 text-center">-</td>
                              <td className="px-3 py-3 text-center">
                                {activeTeam.totals.points}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {activeTeam.totals.rebounds}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {activeTeam.totals.assists}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {activeTeam.totals.steals}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {activeTeam.totals.blocks}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {activeTeam.totals.turnovers}
                              </td>
                              <td className="px-3 py-3 text-center text-zinc-400">
                                {totalFGMade}/{totalFGAttempted}
                              </td>
                              <td className="px-3 py-3 text-center text-zinc-400">
                                {totalFGAttempted > 0 ? `${((totalFGMade / totalFGAttempted) * 100).toFixed(0)}%` : "-"}
                              </td>
                              <td className="px-3 py-3 text-center text-zinc-400">
                                {total3PMade}/{total3PAttempted}
                              </td>
                              <td className="px-3 py-3 text-center text-zinc-400">
                                {total3PAttempted > 0 ? `${((total3PMade / total3PAttempted) * 100).toFixed(0)}%` : "-"}
                              </td>
                              <td className="px-3 py-3 text-center text-zinc-400">
                                {totalFTMade}/{totalFTAttempted}
                              </td>
                              <td className="px-3 py-3 text-center">-</td>
                              <td className="px-3 py-3 text-center">
                                {tdCount > 0 || ddCount > 0 ? (
                                  <span className="text-xs text-zinc-400">
                                    {ddCount > 0 && <span className="text-yellow-400">{ddCount} DD</span>}
                                    {ddCount > 0 && tdCount > 0 && " / "}
                                    {tdCount > 0 && <span className="text-purple-400">{tdCount} TD</span>}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
