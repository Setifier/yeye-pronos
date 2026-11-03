"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, AlertCircle, Clock, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { getTeamLogo } from "@/lib/nba-logos";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

interface InjuredPlayer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
  injuryStatus: string | null;
  injuryNote: string | null;
  injuryReturnDate: string | null;
  team: {
    id: string;
    name: string;
    city: string;
    abbreviation: string;
  } | null;
}

interface TeamGroup {
  team: {
    id: string;
    name: string;
    city: string;
    abbreviation: string;
  };
  players: InjuredPlayer[];
}

export default function InfirmeriePage() {
  const [injuredPlayers, setInjuredPlayers] = useState<InjuredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInjuredPlayers();
  }, []);

  const fetchInjuredPlayers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/players?injured=true");
      if (res.ok) {
        const data = await res.json();
        setInjuredPlayers(data.players || []);
      }
    } catch (error) {
      console.error("Error fetching injured players:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-zinc-800 text-zinc-400";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("out")) return "bg-red-900/50 text-red-400 border-red-800";
    if (statusLower.includes("day-to-day") || statusLower.includes("day to day"))
      return "bg-yellow-900/50 text-yellow-400 border-yellow-800";
    if (statusLower.includes("questionable"))
      return "bg-orange-900/50 text-orange-400 border-orange-800";
    if (statusLower.includes("probable"))
      return "bg-blue-900/50 text-blue-400 border-blue-800";

    return "bg-zinc-800 text-zinc-400";
  };

  const formatReturnDate = (date: string | null) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  // Grouper les joueurs par équipe
  const groupedByTeam: TeamGroup[] = injuredPlayers.reduce((acc, player) => {
    if (!player.team) return acc;

    const existingTeam = acc.find((g) => g.team.id === player.team!.id);
    if (existingTeam) {
      existingTeam.players.push(player);
    } else {
      acc.push({
        team: player.team,
        players: [player],
      });
    }
    return acc;
  }, [] as TeamGroup[]);

  // Trier par nombre de blessés (décroissant)
  groupedByTeam.sort((a, b) => b.players.length - a.players.length);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/joueurs"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400 mb-4 transition"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Retour</span>
        </Link>

        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Activity className="h-10 w-10 text-red-400" />
          Infirmerie NBA
        </h1>
        <p className="text-zinc-400">Suivi des blessures - Saison {getSeasonLabel(getCurrentSeason())}</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-zinc-400">Out</p>
          </div>
          <p className="text-2xl font-bold">
            {injuredPlayers.filter((p) => p.injuryStatus?.toLowerCase().includes("out")).length}
          </p>
        </div>

        <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <p className="text-sm text-zinc-400">Day-to-Day</p>
          </div>
          <p className="text-2xl font-bold">
            {injuredPlayers.filter((p) => p.injuryStatus?.toLowerCase().includes("day")).length}
          </p>
        </div>

        <div className="bg-orange-950/30 border border-orange-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-orange-400" />
            <p className="text-sm text-zinc-400">Questionable</p>
          </div>
          <p className="text-2xl font-bold">
            {injuredPlayers.filter((p) => p.injuryStatus?.toLowerCase().includes("questionable")).length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-zinc-400" />
            <p className="text-sm text-zinc-400">Total</p>
          </div>
          <p className="text-2xl font-bold">{injuredPlayers.length}</p>
        </div>
      </div>

      {/* Liste des blessés groupés par équipe */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Chargement...</p>
        </div>
      ) : injuredPlayers.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <Activity className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-xl font-semibold text-zinc-300 mb-2">
            Aucun joueur blessé !
          </p>
          <p className="text-zinc-500">
            Tout le monde est en forme pour jouer.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByTeam.map((group) => {
            const isExpanded = expandedTeams.has(group.team.id);

            return (
              <div
                key={group.team.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
              >
                {/* Team Header - Clickable */}
                <button
                  onClick={() => toggleTeam(group.team.id)}
                  className="w-full bg-zinc-800/50 border-b border-zinc-700 px-6 py-4 hover:bg-zinc-800/70 transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Expand/Collapse Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>

                    {/* Team Logo */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={getTeamLogo(group.team.abbreviation)}
                        alt={group.team.name}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 text-left">
                      <h2 className="text-xl font-bold">
                        {group.team.city} {group.team.name}
                      </h2>
                      <p className="text-sm text-zinc-400">
                        {group.players.length} joueur{group.players.length > 1 ? "s" : ""} blessé{group.players.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Players - Only show if expanded */}
                {isExpanded && (
                  <div className="divide-y divide-zinc-800">
                    {group.players.map((player) => {
                      const returnDate = formatReturnDate(player.injuryReturnDate);

                      return (
                        <Link
                          key={player.id}
                          href={`/joueurs/${player.id}`}
                          className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_2fr] gap-4 px-6 py-4 hover:bg-zinc-800/30 transition cursor-pointer"
                        >
                          {/* Player */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {player.firstName[0]}
                              {player.lastName[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{player.fullName}</p>
                              <p className="text-xs text-zinc-500">
                                {player.position ? `${player.position}` : ""}
                                {player.jerseyNumber ? ` • #${player.jerseyNumber}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center justify-start">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded border ${getStatusColor(
                                player.injuryStatus
                              )}`}
                            >
                              {player.injuryStatus || "Injured"}
                            </span>
                          </div>

                          {/* Injury type */}
                          <div className="flex items-center text-sm text-zinc-300">
                            {player.injuryNote || "-"}
                          </div>

                          {/* Return date */}
                          <div className="flex items-center justify-start text-sm text-zinc-400">
                            {returnDate ? (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{returnDate}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
