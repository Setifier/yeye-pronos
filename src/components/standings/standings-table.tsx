"use client";

import Image from "next/image";
import { Trophy, Minus } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";
import type { StandingsTeam } from "@/app/api/standings/route";

export type { StandingsTeam };

function playoffBadge(status: StandingsTeam["playoffStatus"]) {
  if (status === "direct")  return <span className="text-[9px] font-bold text-green-500  uppercase tracking-wide">PO</span>;
  if (status === "play-in") return <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">PI</span>;
  return null;
}

export function Cell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`hidden lg:flex items-center justify-center text-sm ${muted ? "text-zinc-500" : "text-zinc-200 font-semibold"}`}>
      {children}
    </div>
  );
}

export function StandingsTable({
  teams, title, accentClass, showPlayoffLines = false, onTeamClick,
}: {
  teams: StandingsTeam[];
  title: string;
  accentClass: string;
  showPlayoffLines?: boolean;
  /** Absent (saisons passées) : pas de fiche équipe, elle montre l'effectif actuel */
  onTeamClick?: (id: string) => void;
}) {
  if (teams.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800">
        <h2 className={`text-base font-bold ${accentClass}`}>{title}</h2>
      </div>
      <div className="hidden lg:grid grid-cols-[2.5rem_3fr_repeat(10,1fr)] gap-1 px-4 py-2 bg-zinc-800/50 border-b border-zinc-700 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
        <div className="text-center">#</div>
        <div>Équipe</div>
        <div className="text-center">W</div>
        <div className="text-center">L</div>
        <div className="text-center">WIN%</div>
        <div className="text-center">GB</div>
        <div className="text-center">CONF</div>
        <div className="text-center">DIV</div>
        <div className="text-center">HOME</div>
        <div className="text-center">AWAY</div>
        <div className="text-center">L10</div>
        <div className="text-center">STREAK</div>
      </div>
      <div>
        {teams.map((team, idx) => {
          const logo = getTeamLogo(team.abbreviation);
          const streakWin = team.currentStreak?.startsWith("W");
          const showDotted = showPlayoffLines && idx === 5;
          const showSolid  = showPlayoffLines && idx === 9;
          return (
            <div key={team.id}>
              <div
                className={`grid grid-cols-1 lg:grid-cols-[2.5rem_3fr_repeat(10,1fr)] gap-1 px-4 py-3 hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/40 relative ${onTeamClick ? "cursor-pointer" : ""}`}
                onClick={onTeamClick ? () => onTeamClick(team.id) : undefined}
              >
                {team.primaryColor && <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: team.primaryColor }} />}
                <div className="hidden lg:flex items-center justify-center gap-1">
                  <span className="text-sm font-bold text-zinc-400">{idx + 1}</span>
                </div>
                <div className="flex items-center gap-3 pl-1">
                  {logo
                    ? <Image src={logo} alt={team.abbreviation} width={32} height={32} className="object-contain flex-shrink-0" />
                    : <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-bold text-zinc-400">{team.abbreviation.slice(0, 3)}</span></div>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        <span className="lg:hidden text-zinc-500 mr-1">{idx + 1}.</span>
                        {team.city} {team.name}
                      </span>
                      {showPlayoffLines && playoffBadge(team.playoffStatus)}
                    </div>
                    <p className="text-xs text-zinc-500 lg:hidden">
                      {team.wins}-{team.losses} · {(team.winPct * 100).toFixed(1)}%
                      {team.currentStreak !== "-" && ` · ${team.currentStreak}`}
                    </p>
                  </div>
                </div>
                <Cell>{team.wins}</Cell>
                <Cell>{team.losses}</Cell>
                <Cell>{(team.winPct * 100).toFixed(1)}%</Cell>
                <Cell muted>{team.gb}</Cell>
                <Cell muted>{team.conferenceRecord}</Cell>
                <Cell muted>{team.divisionRecord}</Cell>
                <Cell muted>{team.homeRecord}</Cell>
                <Cell muted>{team.awayRecord}</Cell>
                <Cell muted>{team.last10Record}</Cell>
                <div className="hidden lg:flex items-center justify-center">
                  <span className={`text-xs font-bold ${streakWin ? "text-green-400" : "text-red-400"}`}>{team.currentStreak}</span>
                </div>
              </div>
              {showDotted && <div className="h-px border-t border-dashed border-green-600/40 mx-4" />}
              {showSolid  && <div className="h-px border-t border-amber-500/40 mx-4" />}
            </div>
          );
        })}
      </div>
      {showPlayoffLines && (
        <div className="flex items-center gap-5 px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1.5"><Trophy className="w-3 h-3 text-green-500" /><span className="text-green-500 font-semibold">PO</span> Playoffs directs (top 6)</span>
          <span className="flex items-center gap-1.5"><Minus className="w-3 h-3 text-amber-400" /><span className="text-amber-400 font-semibold">PI</span> Play-In (7-10)</span>
        </div>
      )}
    </div>
  );
}

export function StandingsTableCompact({
  teams, title, accentClass, showPlayoffLines = false,
}: {
  teams: StandingsTeam[];
  title: string;
  accentClass: string;
  showPlayoffLines?: boolean;
}) {
  if (teams.length === 0) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className={`text-sm font-bold ${accentClass}`}>{title}</h2>
      </div>
      <div className="grid grid-cols-[2rem_1fr_repeat(4,minmax(2.5rem,1fr))] px-3 py-1.5 bg-zinc-800/50 border-b border-zinc-700 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
        <div className="text-center">#</div>
        <div>Équipe</div>
        <div className="text-center">W</div>
        <div className="text-center">L</div>
        <div className="text-center">WIN%</div>
        <div className="text-center">GB</div>
      </div>
      <div>
        {teams.map((team, idx) => {
          const logo = getTeamLogo(team.abbreviation);
          const showDotted = showPlayoffLines && idx === 5;
          const showSolid  = showPlayoffLines && idx === 9;
          return (
            <div key={team.id}>
              <div className="grid grid-cols-[2rem_1fr_repeat(4,minmax(2.5rem,1fr))] px-3 py-2.5 border-b border-zinc-800/40 relative">
                {team.primaryColor && <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: team.primaryColor }} />}
                <div className="flex items-center justify-center">
                  <span className="text-xs font-bold text-zinc-500">{idx + 1}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {logo
                    ? <Image src={logo} alt={team.abbreviation} width={20} height={20} className="object-contain flex-shrink-0" />
                    : <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-[8px] font-bold text-zinc-400">{team.abbreviation.slice(0, 3)}</span></div>}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{team.abbreviation}</span>
                    {showPlayoffLines && playoffBadge(team.playoffStatus)}
                  </div>
                </div>
                <div className="flex items-center justify-center text-xs font-semibold text-zinc-200">{team.wins}</div>
                <div className="flex items-center justify-center text-xs font-semibold text-zinc-200">{team.losses}</div>
                <div className="flex items-center justify-center text-xs font-semibold text-zinc-200">{(team.winPct * 100).toFixed(1)}%</div>
                <div className="flex items-center justify-center text-xs text-zinc-500">{team.gb}</div>
              </div>
              {showDotted && <div className="h-px border-t border-dashed border-green-600/40 mx-3" />}
              {showSolid  && <div className="h-px border-t border-amber-500/40 mx-3" />}
            </div>
          );
        })}
      </div>
      {showPlayoffLines && (
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-green-500" /><span className="text-green-500 font-semibold">PO</span> Top 6</span>
          <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-amber-400" /><span className="text-amber-400 font-semibold">PI</span> 7-10</span>
        </div>
      )}
    </div>
  );
}
