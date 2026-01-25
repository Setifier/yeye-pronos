"use client";

import { useState, useEffect } from "react";
import { getTeamLogo } from "@/lib/nba-logos";
import { ChevronDown } from "lucide-react";
import { StatsNavbar } from "@/components/stats-navbar";
import { TeamDetailsModal } from "@/components/team-details-modal";

interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  primaryColor?: string;
  secondaryColor?: string;
  seasonStats?: {
    wins: number;
    losses: number;
    winPct: number;
    conferenceRank?: number;
    divisionRank?: number;
    homeRecord?: string;
    awayRecord?: string;
    conferenceRecord?: string;
    divisionRecord?: string;
    last10Record?: string;
    currentStreak?: string;
  }[];
}

// Mapping des divisions par équipe
const TEAM_DIVISIONS: Record<string, string> = {
  // Atlantic
  BOS: "Atlantic",
  BKN: "Atlantic",
  NYK: "Atlantic",
  PHI: "Atlantic",
  TOR: "Atlantic",
  // Central
  CHI: "Central",
  CLE: "Central",
  DET: "Central",
  IND: "Central",
  MIL: "Central",
  // Southeast
  ATL: "Southeast",
  CHA: "Southeast",
  MIA: "Southeast",
  ORL: "Southeast",
  WAS: "Southeast",
  // Northwest
  DEN: "Northwest",
  MIN: "Northwest",
  OKC: "Northwest",
  POR: "Northwest",
  UTA: "Northwest",
  // Pacific
  GSW: "Pacific",
  LAC: "Pacific",
  LAL: "Pacific",
  PHX: "Pacific",
  SAC: "Pacific",
  // Southwest
  DAL: "Southwest",
  HOU: "Southwest",
  MEM: "Southwest",
  NOP: "Southwest",
  SAS: "Southwest",
};

export default function StandingsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"conference" | "division" | "league">("conference");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamStats = (team: Team) => {
    const stats = team.seasonStats?.[0];
    const wins = stats?.wins || 0;
    const losses = stats?.losses || 0;
    const winPct = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : "0.0";

    return {
      wins,
      losses,
      winPct,
      homeRecord: stats?.homeRecord || "0-0",
      awayRecord: stats?.awayRecord || "0-0",
      conferenceRecord: stats?.conferenceRecord || "0-0",
      divisionRecord: stats?.divisionRecord || "0-0",
      last10Record: stats?.last10Record || "0-0",
      currentStreak: stats?.currentStreak || "-",
    };
  };

  const calculateGB = (teamWins: number, teamLosses: number, leaderWins: number, leaderLosses: number) => {
    if (teamWins === leaderWins && teamLosses === leaderLosses) return "-";
    const gb = ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2;
    return gb.toFixed(1);
  };

  const sortTeamsByRecord = (teamsToSort: Team[]) => {
    return [...teamsToSort].sort((a, b) => {
      const aStats = getTeamStats(a);
      const bStats = getTeamStats(b);

      if (bStats.wins !== aStats.wins) {
        return bStats.wins - aStats.wins;
      }
      return aStats.losses - bStats.losses;
    });
  };

  const getConferenceStandings = () => {
    const eastTeams = teams.filter((t) => t.conference === "EAST");
    const westTeams = teams.filter((t) => t.conference === "WEST");

    return {
      EAST: sortTeamsByRecord(eastTeams),
      WEST: sortTeamsByRecord(westTeams),
    };
  };

  const getDivisionStandings = () => {
    const divisions = ["Atlantic", "Central", "Southeast", "Northwest", "Pacific", "Southwest"];
    const standings: Record<string, Team[]> = {};

    divisions.forEach((division) => {
      const divisionTeams = teams.filter((t) => TEAM_DIVISIONS[t.abbreviation] === division);
      standings[division] = sortTeamsByRecord(divisionTeams);
    });

    return standings;
  };

  const getLeagueStandings = () => {
    return sortTeamsByRecord(teams);
  };

  const renderStandingsTable = (teams: Team[], title: string, colorClass: string, showPlayoffLines = false) => {
    if (teams.length === 0) return null;

    const sortedTeams = sortTeamsByRecord(teams);
    const leader = sortedTeams[0];
    const leaderStats = getTeamStats(leader);

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className={`text-xl font-bold ${colorClass}`}>{title}</h2>
        </div>

        {/* Header */}
        <div className="hidden lg:grid grid-cols-[3rem_3fr_repeat(10,1fr)] gap-2 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700 text-xs font-medium text-zinc-400">
          <div className="text-center">#</div>
          <div>ÉQUIPE</div>
          <div className="text-center">W</div>
          <div className="text-center">L</div>
          <div className="text-center">WIN%</div>
          <div className="text-center">GB</div>
          <div className="text-center">CONF</div>
          <div className="text-center">DIV</div>
          <div className="text-center">HOME</div>
          <div className="text-center">ROAD</div>
          <div className="text-center">LAST10</div>
          <div className="text-center">STREAK</div>
        </div>

        {/* Rows */}
        <div>
          {sortedTeams.map((team, idx) => {
            const stats = getTeamStats(team);
            const gb = calculateGB(stats.wins, stats.losses, leaderStats.wins, leaderStats.losses);

            // Ligne de séparation après le 6ème (playoffs directs) et après le 10ème (play-in)
            const showDottedLine = showPlayoffLines && idx === 5; // Après le 6ème
            const showSolidLine = showPlayoffLines && idx === 9;  // Après le 10ème

            return (
              <div key={team.id}>
                <div
                  className={`grid grid-cols-1 lg:grid-cols-[3rem_3fr_repeat(10,1fr)] gap-2 px-4 py-3 hover:bg-zinc-800/30 transition border-b border-zinc-800/50 relative cursor-pointer`}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  {/* Colored accent bar on left */}
                  {team.primaryColor && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                  )}

                  {/* Rank */}
                  <div className="hidden lg:flex items-center justify-center text-sm font-semibold text-zinc-400">
                    {idx + 1}
                  </div>

                  {/* Team */}
                  <div className="flex items-center gap-3">
                    <img
                      src={getTeamLogo(team.abbreviation)}
                      alt={team.abbreviation}
                      className="w-8 h-8 object-contain"
                    />
                    <div>
                      <p className="font-semibold text-sm lg:text-base text-white">
                        <span className="lg:hidden text-zinc-500 mr-2">{idx + 1}.</span>
                        {team.city} {team.name}
                      </p>
                      <p className="text-xs text-zinc-500 lg:hidden">
                        {stats.wins}-{stats.losses} • {stats.winPct}%
                      </p>
                    </div>
                  </div>

                  {/* Stats - Desktop */}
                  <div className="hidden lg:flex items-center justify-center text-sm font-semibold">
                    {stats.wins}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm font-semibold">
                    {stats.losses}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {stats.winPct}%
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {gb}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {stats.conferenceRecord}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {stats.divisionRecord}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {stats.homeRecord}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {stats.awayRecord}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm text-zinc-400">
                    {stats.last10Record}
                  </div>
                  <div className="hidden lg:flex items-center justify-center text-sm font-medium text-zinc-300">
                    {stats.currentStreak}
                  </div>
                </div>

                {/* Ligne pointillée après le 6ème */}
                {showDottedLine && (
                  <div className="border-b border-dashed border-green-600/50 my-1"></div>
                )}

                {/* Ligne continue après le 10ème */}
                {showSolidLine && (
                  <div className="border-b border-yellow-600/50 my-1"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const conferenceStandings = getConferenceStandings();
  const divisionStandings = getDivisionStandings();
  const leagueStandings = getLeagueStandings();

  return (
    <>
      <StatsNavbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        {/* Header */}
        <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Classement NBA</h1>
        <p className="text-zinc-400">Saison 2025-26</p>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="relative inline-block">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "conference" | "division" | "league")}
            className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-zinc-50 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="conference">Par Conférence</option>
            <option value="division">Par Division</option>
            <option value="league">Par Ligue</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        </div>

        {/* Legend */}
        {viewMode === "conference" && (
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 border-b-2 border-dashed border-green-600"></div>
              <span className="text-zinc-400">Playoffs directs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 border-b-2 border-yellow-600"></div>
              <span className="text-zinc-400">Play-in</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Chargement...</p>
        </div>
      ) : (
        <>
          {/* Conference View - Vertical Stack */}
          {viewMode === "conference" && (
            <div className="space-y-6">
              {renderStandingsTable(conferenceStandings.EAST, "Eastern Conference", "text-blue-400", true)}
              {renderStandingsTable(conferenceStandings.WEST, "Western Conference", "text-red-400", true)}
            </div>
          )}

          {/* Division View - Vertical Stack */}
          {viewMode === "division" && (
            <div className="space-y-6">
              {renderStandingsTable(divisionStandings.Atlantic, "Atlantic Division", "text-blue-400")}
              {renderStandingsTable(divisionStandings.Central, "Central Division", "text-blue-400")}
              {renderStandingsTable(divisionStandings.Southeast, "Southeast Division", "text-blue-400")}
              {renderStandingsTable(divisionStandings.Northwest, "Northwest Division", "text-red-400")}
              {renderStandingsTable(divisionStandings.Pacific, "Pacific Division", "text-red-400")}
              {renderStandingsTable(divisionStandings.Southwest, "Southwest Division", "text-red-400")}
            </div>
          )}

          {/* League View - All 30 Teams */}
          {viewMode === "league" && (
            <div className="space-y-6">
              {renderStandingsTable(leagueStandings, "Classement Ligue", "text-purple-400")}
            </div>
          )}
        </>
      )}
      </main>

      {/* Team Details Modal */}
      {selectedTeamId && (
        <TeamDetailsModal
          isOpen={!!selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
          teamId={selectedTeamId}
        />
      )}
    </>
  );
}
