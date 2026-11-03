"use client";

import { useState, useEffect } from "react";
import { StatsNavbar } from "@/components/layout/stats-navbar";
import { TeamDetailsModal } from "@/components/matchs/team-details-modal";
import { StandingsTable } from "@/components/standings/standings-table";
import type { StandingsTeam } from "@/app/api/standings/route";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

// ─── Division membership ────────────────────────────────────────────────────

const TEAM_DIVISION: Record<string, string> = {
  BOS: "Atlantic",  BKN: "Atlantic",  NYK: "Atlantic",  PHI: "Atlantic",  TOR: "Atlantic",
  CHI: "Central",   CLE: "Central",   DET: "Central",   IND: "Central",   MIL: "Central",
  ATL: "Southeast", CHA: "Southeast", MIA: "Southeast", ORL: "Southeast", WAS: "Southeast",
  DEN: "Northwest", MIN: "Northwest", OKC: "Northwest", POR: "Northwest", UTA: "Northwest",
  GSW: "Pacific",   LAC: "Pacific",   LAL: "Pacific",   PHX: "Pacific",   SAC: "Pacific",
  DAL: "Southwest", HOU: "Southwest", MEM: "Southwest", NOP: "Southwest", SAS: "Southwest",
};

const DIVISIONS = {
  EAST: ["Atlantic", "Central", "Southeast"],
  WEST: ["Northwest", "Pacific", "Southwest"],
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StandingsPage() {
  const [east, setEast]     = useState<StandingsTeam[]>([]);
  const [west, setWest]     = useState<StandingsTeam[]>([]);
  const [season, setSeason] = useState(getCurrentSeason());
  const [loading, setLoading]   = useState(true);
  const [viewMode, setViewMode] = useState<"conference" | "division" | "league">("conference");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/standings");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setEast(data.EAST ?? []);
        setWest(data.WEST ?? []);
        setSeason(data.season ?? getCurrentSeason());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const all = [...east, ...west];

  const divisionTeams = (div: string) =>
    all
      .filter((t) => TEAM_DIVISION[t.abbreviation] === div)
      .sort((a, b) => {
        if (Math.abs(b.winPct - a.winPct) > 1e-6) return b.winPct - a.winPct;
        const aConf = parseInt(a.conferenceRecord.split("-")[0] ?? "0", 10);
        const bConf = parseInt(b.conferenceRecord.split("-")[0] ?? "0", 10);
        if (bConf !== aConf) return bConf - aConf;
        return b.pointDifferential - a.pointDifferential;
      });

  const leagueTeams = [...all].sort((a, b) => {
    if (Math.abs(b.winPct - a.winPct) > 1e-6) return b.winPct - a.winPct;
    const aConf = parseInt(a.conferenceRecord.split("-")[0] ?? "0", 10);
    const bConf = parseInt(b.conferenceRecord.split("-")[0] ?? "0", 10);
    if (bConf !== aConf) return bConf - aConf;
    return b.pointDifferential - a.pointDifferential;
  });

  return (
    <>
      <StatsNavbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Classement NBA</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Saison régulière {getSeasonLabel(season)} · 1 à 6 qualifiés · 7 à 10 Play-in
          </p>
        </div>
        <div className="mb-6 inline-flex rounded-xl bg-zinc-900 p-1 ring-1 ring-zinc-800">
          {([
            ["conference", "Conférences"],
            ["division", "Divisions"],
            ["league", "Ligue"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === mode ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-zinc-700 border-t-zinc-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === "conference" && (
              <>
                <StandingsTable teams={east} title="Eastern Conference" accentClass="text-blue-400" showPlayoffLines onTeamClick={setSelectedTeam} />
                <StandingsTable teams={west} title="Western Conference" accentClass="text-red-400" showPlayoffLines onTeamClick={setSelectedTeam} />
              </>
            )}
            {viewMode === "division" && (
              <>
                {DIVISIONS.EAST.map((div) => <StandingsTable key={div} teams={divisionTeams(div)} title={`${div} Division`} accentClass="text-blue-400" onTeamClick={setSelectedTeam} />)}
                {DIVISIONS.WEST.map((div) => <StandingsTable key={div} teams={divisionTeams(div)} title={`${div} Division`} accentClass="text-red-400" onTeamClick={setSelectedTeam} />)}
              </>
            )}
            {viewMode === "league" && (
              <StandingsTable teams={leagueTeams} title="Classement général" accentClass="text-purple-400" onTeamClick={setSelectedTeam} />
            )}
          </div>
        )}
      </main>
      {selectedTeam && <TeamDetailsModal isOpen onClose={() => setSelectedTeam(null)} teamId={selectedTeam} />}
    </>
  );
}
