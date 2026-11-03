"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";
import type { PlayerStatsResponse, SeasonTypeStats } from "@/app/api/players/[id]/stats/route";

type SeasonTypeKey = "Regular Season" | "Play-In Tournament" | "Playoffs";

const TAB_LABELS: Record<SeasonTypeKey, string> = {
  "Regular Season":     "Saison régulière",
  "Play-In Tournament": "Play-In",
  "Playoffs":           "Playoffs",
};

const TAB_COLORS: Record<SeasonTypeKey, string> = {
  "Regular Season":     "bg-orange-500 text-white",
  "Play-In Tournament": "bg-[#dcff50] text-zinc-900",
  "Playoffs":           "bg-red-500 text-white",
};

const TAB_INACTIVE: Record<SeasonTypeKey, string> = {
  "Regular Season":     "text-zinc-400 hover:text-orange-300 hover:bg-zinc-800",
  "Play-In Tournament": "text-zinc-400 hover:text-[#dcff50] hover:bg-zinc-800",
  "Playoffs":           "text-zinc-400 hover:text-red-400 hover:bg-zinc-800",
};

interface PlayerStatsProps {
  playerId: string;
}

export function PlayerStats({ playerId }: PlayerStatsProps) {
  const [data, setData]           = useState<PlayerStatsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeType, setActiveType] = useState<SeasonTypeKey>("Regular Season");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/players/${playerId}/stats`);
        if (!res.ok) throw new Error("Erreur lors de la récupération des stats");
        const result: PlayerStatsResponse = await res.json();
        setData(result);
        // Sélectionner automatiquement le premier type disponible
        if (result.availableTypes.length > 0) {
          setActiveType(result.availableTypes[0]!);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [playerId]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-500 text-lg">{error || "Impossible de charger les statistiques"}</p>
      </div>
    );
  }

  if (data.availableTypes.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-500 text-lg">Aucune statistique disponible pour ce joueur ({data.season})</p>
      </div>
    );
  }

  const stats = data.byType[activeType];

  return (
    <div className="space-y-6">

      {/* Sélecteur de type de saison */}
      {data.availableTypes.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 mr-1">{data.season}</span>
          {data.availableTypes.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                t === activeType ? TAB_COLORS[t] : `${TAB_INACTIVE[t]} bg-zinc-800/60`
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {!stats ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-zinc-500">Aucune statistique pour ce type de saison.</p>
        </div>
      ) : (
        <StatsPanel stats={stats} season={data.season} showLabel={data.availableTypes.length === 1} />
      )}
    </div>
  );
}

// ─── Panneau de stats ─────────────────────────────────────────

function StatsPanel({
  stats,
  season,
  showLabel,
}: {
  stats: SeasonTypeStats;
  season: string;
  showLabel: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Moyennes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-orange-400" />
          <h2 className="text-xl font-bold">
            {showLabel ? `${stats.label} ${season}` : `Moyennes — ${stats.label}`}
          </h2>
          <span className="ml-auto text-sm text-zinc-400 tabular-nums">
            {stats.gamesPlayed} match{stats.gamesPlayed > 1 ? "s" : ""}
          </span>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { val: stats.averages.ppg,  lbl: "PTS" },
            { val: stats.averages.rpg,  lbl: "REB" },
            { val: stats.averages.apg,  lbl: "PD"  },
            { val: stats.averages.spg,  lbl: "INT" },
            { val: stats.averages.bpg,  lbl: "CTR" },
            { val: stats.averages.mpg,  lbl: "MIN" },
          ].map(({ val, lbl }) => (
            <div key={lbl} className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-white tabular-nums">{val}</p>
              <p className="text-xs text-zinc-400 mt-1">{lbl}</p>
            </div>
          ))}
        </div>

        {/* Pourcentages */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { val: stats.averages.fgPct,  lbl: "FG%" },
            { val: stats.averages.fg3Pct, lbl: "3PT%" },
            { val: stats.averages.ftPct,  lbl: "LF%" },
          ].map(({ val, lbl }) => (
            <div key={lbl} className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white tabular-nums">{val}%</p>
              <p className="text-xs text-zinc-400 mt-1">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 10 derniers matchs */}
      {stats.lastGames.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-bold">
              {stats.lastGames.length === 10 ? "10 derniers matchs" : `${stats.lastGames.length} dernier${stats.lastGames.length > 1 ? "s" : ""} match${stats.lastGames.length > 1 ? "s" : ""}`}
            </h2>
            <span className="ml-auto text-xs text-zinc-600">{stats.label}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 text-xs text-zinc-400 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">vs</th>
                  <th className="px-3 py-3 text-center">MIN</th>
                  <th className="px-3 py-3 text-center">PTS</th>
                  <th className="px-3 py-3 text-center">REB</th>
                  <th className="px-3 py-3 text-center">PD</th>
                  <th className="px-3 py-3 text-center">FG</th>
                  <th className="px-3 py-3 text-center">3PT</th>
                  <th className="px-3 py-3 text-center">LF</th>
                  <th className="px-3 py-3 text-center">+/-</th>
                  <th className="px-3 py-3 text-center">DD/TD</th>
                  <th className="px-3 py-3 text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                {stats.lastGames.map((g) => (
                  <tr key={g.gameId} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(g.gameDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{g.opponent}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{g.minutes || "–"}</td>
                    <td className="px-3 py-3 text-center font-bold">{g.points}</td>
                    <td className="px-3 py-3 text-center">{g.rebounds ?? "–"}</td>
                    <td className="px-3 py-3 text-center">{g.assists ?? "–"}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{g.fieldGoals}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{g.threePointers}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{g.freeThrows}</td>
                    <td className={`px-3 py-3 text-center font-medium ${
                      (g.plusMinus ?? 0) > 0 ? "text-green-500" :
                      (g.plusMinus ?? 0) < 0 ? "text-red-500" : ""
                    }`}>
                      {g.plusMinus !== null ? (g.plusMinus > 0 ? "+" : "") + g.plusMinus : "–"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {g.isTripleDouble ? (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">TD</span>
                      ) : g.isDoubleDouble ? (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">DD</span>
                      ) : (
                        <span className="text-zinc-600">–</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Link href={`/matchs/${g.gameId}`} className="text-orange-400 hover:text-orange-300 text-xs">
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totaux */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">
          Totaux — {stats.label}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { val: stats.gamesPlayed,         lbl: "MJ",    color: "" },
            { val: stats.totals.points,        lbl: "PTS",   color: "" },
            { val: stats.totals.rebounds,      lbl: "REB",   color: "" },
            { val: stats.totals.assists,       lbl: "PD",    color: "" },
            { val: stats.totals.steals,        lbl: "INT",   color: "" },
            { val: stats.totals.doubleDoubles, lbl: "DD",    color: "text-yellow-400" },
            { val: stats.totals.tripleDoubles, lbl: "TD",    color: "text-purple-400" },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} className={`rounded-lg p-4 text-center ${
              lbl === "DD" ? "bg-yellow-500/10 border border-yellow-500/20" :
              lbl === "TD" ? "bg-purple-500/10 border border-purple-500/20" :
              "bg-zinc-800/50"
            }`}>
              <p className={`text-2xl font-bold tabular-nums ${color || "text-white"}`}>{val}</p>
              <p className={`text-xs mt-1 ${color ? `${color}/70` : "text-zinc-400"}`}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
