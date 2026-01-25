"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, Users, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { StatsNavbar } from "@/components/stats-navbar";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
  height: string | null;
  weight: string | null;
  heightMetric: string | null;
  weightMetric: string | null;
  college: string | null;
  country: string | null;
  headshot: string | null;
  isInjured: boolean;
  injuryStatus: string | null;
  team: {
    id: string;
    name: string;
    city: string;
    abbreviation: string;
  } | null;
}

interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
}

const PLAYERS_PER_PAGE = 50;

export default function JoueursPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTeam, selectedPosition, selectedCollege, selectedCountry]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [playersRes, teamsRes] = await Promise.all([
        fetch("/api/players"),
        fetch("/api/teams"),
      ]);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData.players || []);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique values for filters
  const uniquePositions = Array.from(
    new Set(players.map((p) => p.position).filter(Boolean))
  ).sort() as string[];

  const uniqueColleges = Array.from(
    new Set(players.map((p) => p.college).filter(Boolean))
  ).sort() as string[];

  const uniqueCountries = Array.from(
    new Set(players.map((p) => p.country).filter(Boolean))
  ).sort() as string[];

  // Filter players
  const filteredPlayers = players.filter((player) => {
    const matchSearch =
      search === "" ||
      player.fullName.toLowerCase().includes(search.toLowerCase()) ||
      player.team?.abbreviation.toLowerCase().includes(search.toLowerCase());

    const matchTeam =
      selectedTeam === "all" || player.team?.id === selectedTeam;

    const matchPosition =
      selectedPosition === "all" || player.position === selectedPosition;

    const matchCollege =
      selectedCollege === "all" || player.college === selectedCollege;

    const matchCountry =
      selectedCountry === "all" || player.country === selectedCountry;

    return matchSearch && matchTeam && matchPosition && matchCollege && matchCountry;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE);
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
  const endIndex = startIndex + PLAYERS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex);

  const injuredCount = players.filter((p) => p.isInjured).length;

  return (
    <>
      <StatsNavbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        {/* Header */}
        <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Joueurs NBA</h1>
        <p className="text-zinc-400">Saison 2025-2026</p>
      </div>

      {/* Stats rapides */}
      <div className="flex items-center justify-between mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{players.length}</p>
              <p className="text-sm text-zinc-500">Joueurs actifs</p>
            </div>
          </div>
        </div>

        <Link
          href="/joueurs/infirmerie"
          className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 hover:border-red-700 rounded-lg transition group"
        >
          <Activity className="h-5 w-5 text-red-400 group-hover:text-red-300 transition" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-red-400 group-hover:text-red-300 transition">
              Infirmerie
            </span>
            <span className="text-xs text-zinc-500">
              {injuredCount} blessé{injuredCount > 1 ? "s" : ""}
            </span>
          </div>
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">Toutes les équipes</option>
              {teams
                .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation))
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.abbreviation}
                  </option>
                ))}
            </select>
          </div>

          {/* Position filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All positions</option>
              {uniquePositions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          {/* College filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All colleges</option>
              {uniqueColleges.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>

          {/* Country filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All countries</option>
              {uniqueCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-zinc-500">
            {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? "s" : ""} trouvé
            {filteredPlayers.length > 1 ? "s" : ""}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-4">
              <div className="text-zinc-400">
                Affichage {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)} sur{" "}
                {filteredPlayers.length}
              </div>

              {/* Pagination en haut */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>

                <span className="text-zinc-400">
                  Page <span className="font-semibold text-zinc-50">{currentPage}</span> of{" "}
                  <span className="font-semibold text-zinc-50">{totalPages}</span>
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liste des joueurs */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Chargement...</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Aucun joueur trouvé</p>
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="hidden lg:grid grid-cols-[3fr_1.5fr_1fr_1fr_1fr_1fr_2fr_1.5fr_1.2fr] gap-3 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700 text-xs font-medium text-zinc-400">
              <div>PLAYER</div>
              <div>TEAM</div>
              <div className="text-center">NUMBER</div>
              <div className="text-center">POSITION</div>
              <div className="text-center">HEIGHT</div>
              <div className="text-center">WEIGHT</div>
              <div>LAST ATTENDED</div>
              <div className="text-center">COUNTRY</div>
              <div className="text-center">STATUS</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-zinc-800">
              {paginatedPlayers.map((player) => (
                <Link
                  key={player.id}
                  href={`/joueurs/${player.id}`}
                  className={`grid grid-cols-1 lg:grid-cols-[3fr_1.5fr_1fr_1fr_1fr_1fr_2fr_1.5fr_1.2fr] gap-3 px-4 py-3 hover:bg-zinc-800/50 transition cursor-pointer ${
                    player.isInjured ? "bg-red-950/10" : ""
                  }`}
                >
                  {/* Player name */}
                  <div className="flex items-center gap-3">
                    {player.headshot ? (
                      <Image
                        src={player.headshot}
                        alt={player.fullName}
                        width={40}
                        height={40}
                        className="rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {player.firstName[0]}
                        {player.lastName[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{player.fullName}</p>
                      <p className="text-xs text-zinc-500 lg:hidden mt-1">
                        {player.team ? player.team.abbreviation : "FA"}
                        {player.position && ` • ${player.position}`}
                        {player.jerseyNumber && ` • #${player.jerseyNumber}`}
                      </p>
                    </div>
                  </div>

                  {/* Team */}
                  <div className="hidden lg:flex items-center">
                    {player.team ? (
                      <span className="text-sm truncate" title={`${player.team.city} ${player.team.name}`}>
                        {player.team.abbreviation}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-500">FA</span>
                    )}
                  </div>

                  {/* Number */}
                  <div className="hidden lg:flex items-center justify-center">
                    <span className="text-sm text-zinc-400">
                      {player.jerseyNumber || "-"}
                    </span>
                  </div>

                  {/* Position */}
                  <div className="hidden lg:flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-400">
                      {player.position || "-"}
                    </span>
                  </div>

                  {/* Height */}
                  <div className="hidden lg:flex items-center justify-center">
                    <span className="text-sm text-zinc-400">
                      {player.height || "-"}
                      {player.heightMetric && ` (${player.heightMetric}m)`}
                    </span>
                  </div>

                  {/* Weight */}
                  <div className="hidden lg:flex items-center justify-center">
                    <span className="text-sm text-zinc-400">
                      {player.weight || "-"}
                      {player.weightMetric && ` (${player.weightMetric}kg)`}
                    </span>
                  </div>

                  {/* College */}
                  <div className="hidden lg:flex items-center">
                    <span className="text-sm text-zinc-400 truncate" title={player.college || ""}>
                      {player.college || "-"}
                    </span>
                  </div>

                  {/* Country */}
                  <div className="hidden lg:flex items-center justify-center">
                    <span className="text-sm text-zinc-400">
                      {player.country || "-"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden lg:flex items-center justify-center">
                    {player.isInjured ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-900/50 text-red-400 rounded border border-red-800">
                        {player.injuryStatus || "Injured"}
                      </span>
                    ) : (
                      <span className="text-xs text-green-400 font-medium">Healthy</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">
                  Page{" "}
                  <span className="font-semibold text-zinc-50">{currentPage}</span> of{" "}
                  <span className="font-semibold text-zinc-50">{totalPages}</span>
                </span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
      </main>
    </>
  );
}
