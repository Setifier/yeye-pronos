"use client";

import Image from "next/image";
import {
  Eye, EyeOff, X, Calendar, Ban, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamInfo {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export interface SeriesGame {
  id: string;
  gameDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  isIfNecessary: boolean;
  homeTeamId: string;
  awayTeamId: string;
}

export interface Series {
  id: string;
  season: string;
  seriesKey: string;
  round: number | null;
  conference: string | null;
  team1: TeamInfo;
  team2: TeamInfo;
  team1Wins: number;
  team2Wins: number;
  team1Seed: number | null;
  team2Seed: number | null;
  winnerId: string | null;
  status: string;
  games: SeriesGame[];
}

export interface PlayInGame {
  id:         string;
  gameDate:   string;
  status:     string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore:  number | null;
  awayScore:  number | null;
  winnerId:   string | null;
  homeTeam:   TeamInfo;
  awayTeam:   TeamInfo;
}

export interface PlayInConf {
  game78:       PlayInGame | null;
  game910:      PlayInGame | null;
  gameDeciding: PlayInGame | null;
}

export interface PlayInData {
  season:  string;
  seedMap: Record<string, number>;
  west:    PlayInConf | null;
  east:    PlayInConf | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROUND_LABELS: Record<number, string> = {
  1: "Premier Tour",
  2: "Demi-finales de conférence",
  3: "Finales de conférence",
  4: "NBA Finals",
};

const ROUND_LABELS_SHORT: Record<number, string> = {
  1: "1er Tour",
  2: "Demi-finales",
  3: "Finales de conf.",
  4: "Finals",
};

const BRACKET_SEED_ORDER = [1, 4, 3, 2];

export function bracketPos(s: Series): number {
  const top = Math.min(s.team1Seed ?? 99, s.team2Seed ?? 99);
  const i = BRACKET_SEED_ORDER.indexOf(top);
  return i === -1 ? 99 : i;
}

const COL_W = "w-[148px]";

// ─── Series Card ──────────────────────────────────────────────────────────────

export function SeriesCard({
  series,
  compact = false,
  onClick,
  hideScore = false,
  neutralResult = false,
  prediction,
}: {
  series:         Series;
  compact?:       boolean;
  onClick:        () => void;
  hideScore?:     boolean;
  neutralResult?: boolean;
  prediction?:    string;
}) {
  const isCompleted = series.status === "COMPLETED";
  const t1Won = isCompleted && !neutralResult && series.winnerId === series.team1.id;
  const t2Won = isCompleted && !neutralResult && series.winnerId === series.team2.id;
  const logoSize = compact ? 22 : 26;

  const renderRow = (
    team: TeamInfo, wins: number, seed: number | null, isWinner: boolean, isLoser: boolean
  ) => {
    const logo = getTeamLogo(team.abbreviation);
    const isPredicted = prediction === team.id;
    const betResult = isPredicted
      ? (isCompleted ? (isWinner ? "correct" : "wrong") : "pending")
      : null;
    return (
      <div className={`flex items-center gap-2 px-2.5 py-2 ${isLoser ? "opacity-40" : ""}`}>
        <span className="text-[10px] font-bold text-zinc-600 w-3 text-center flex-shrink-0">{seed ?? ""}</span>
        {logo ? (
          <Image src={logo} alt={team.abbreviation} width={logoSize} height={logoSize} className="object-contain flex-shrink-0" />
        ) : (
          <div className="rounded bg-zinc-700 flex items-center justify-center flex-shrink-0" style={{ width: logoSize, height: logoSize }}>
            <span className="text-[8px] font-bold text-zinc-400">{team.abbreviation.slice(0, 3)}</span>
          </div>
        )}
        <span className={`text-xs font-semibold flex-1 min-w-0 truncate ${isWinner ? "text-white" : isLoser ? "text-zinc-600" : "text-zinc-200"}`}>
          {team.abbreviation}
        </span>
        {betResult && (
          <span className={`text-[11px] font-black flex-shrink-0 w-3 text-center ${
            betResult === "correct" ? "text-green-400" :
            betResult === "wrong"   ? "text-red-400/80" :
            "text-zinc-500"
          }`}>
            {betResult === "correct" ? "✓" : betResult === "wrong" ? "✗" : "●"}
          </span>
        )}
        {!hideScore && (
          <span className={`text-sm font-bold tabular-nums w-4 text-right flex-shrink-0 ${isWinner ? "text-zinc-100" : isLoser ? "text-zinc-600" : "text-zinc-300"}`}>
            {wins}
          </span>
        )}
      </div>
    );
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border overflow-hidden transition-colors duration-150 cursor-pointer ${
        isCompleted
          ? "border-zinc-600/50 bg-zinc-800/40 hover:border-zinc-500/70"
          : "border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600/60 hover:bg-zinc-800/70"
      }`}
    >
      {renderRow(series.team1, series.team1Wins, series.team1Seed, t1Won, t2Won)}
      <div className="h-px bg-zinc-700/60" />
      {renderRow(series.team2, series.team2Wins, series.team2Seed, t2Won, t1Won)}
    </button>
  );
}

// ─── TBD placeholder ──────────────────────────────────────────────────────────

export function TBDCard() {
  const row = (
    <div className="flex items-center gap-2 px-2.5 py-2">
      <span className="text-[10px] font-bold text-zinc-800 w-3 text-center flex-shrink-0">—</span>
      <div className="w-[22px] h-[22px] rounded bg-zinc-800/50 flex-shrink-0" />
      <span className="text-xs font-semibold text-zinc-700 flex-1">TBD</span>
    </div>
  );
  return (
    <div className="w-full rounded-xl border border-zinc-800/50 border-dashed overflow-hidden">
      {row}
      <div className="h-px bg-zinc-800/30" />
      {row}
    </div>
  );
}

// ─── SVG Connectors ───────────────────────────────────────────────────────────

export function RoundConnector({ pairs, side }: { pairs: 1 | 2; side: "left" | "right" }) {
  const pIn  = side === "right" ? "0%"   : "100%";
  const pOut = side === "right" ? "100%" : "0%";
  const pBar = "50%";
  const lp   = { stroke: "#52525b", strokeWidth: "1.5" };

  if (pairs === 1) {
    return (
      <div className="w-5 flex-shrink-0 self-stretch relative">
        <svg className="absolute inset-0 w-full h-full">
          <line x1={pIn}  y1="24.1%" x2={pBar} y2="24.1%" {...lp} />
          <line x1={pIn}  y1="75.9%" x2={pBar} y2="75.9%" {...lp} />
          <line x1={pBar} y1="24.1%" x2={pBar} y2="75.9%" {...lp} />
          <line x1={pBar} y1="50%"   x2={pOut} y2="50%"   {...lp} />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-5 flex-shrink-0 self-stretch relative">
      <svg className="absolute inset-0 w-full h-full">
        <line x1={pIn}  y1="11.5%" x2={pBar} y2="11.5%" {...lp} />
        <line x1={pIn}  y1="36.8%" x2={pBar} y2="36.8%" {...lp} />
        <line x1={pBar} y1="11.5%" x2={pBar} y2="36.8%" {...lp} />
        <line x1={pBar} y1="24.1%" x2={pOut} y2="24.1%" {...lp} />
        <line x1={pIn}  y1="63.2%" x2={pBar} y2="63.2%" {...lp} />
        <line x1={pIn}  y1="88.5%" x2={pBar} y2="88.5%" {...lp} />
        <line x1={pBar} y1="63.2%" x2={pBar} y2="88.5%" {...lp} />
        <line x1={pBar} y1="75.9%" x2={pOut} y2="75.9%" {...lp} />
      </svg>
    </div>
  );
}

// ─── Conference bracket grid ──────────────────────────────────────────────────

export function ConferenceBracketGrid({
  round1Series, round2Series, round3Series, onSeriesClick, isRight = false, predictions,
}: {
  round1Series: Series[];
  round2Series: Series[];
  round3Series: Series[];
  onSeriesClick: (s: Series) => void;
  isRight?: boolean;
  predictions?: Record<string, string>;
}) {
  const r1    = [...round1Series].sort((a, b) => bracketPos(a) - bracketPos(b));
  const pair1 = r1.slice(0, 2);
  const pair2 = r1.slice(2, 4);
  const pair1Ids    = new Set(pair1.flatMap((s) => [s.team1.id, s.team2.id]));
  const isFromPair1 = (s: Series) => pair1Ids.has(s.team1.id) || pair1Ids.has(s.team2.id);
  const sortedR2    = [...round2Series].sort((a, b) => Number(!isFromPair1(a)) - Number(!isFromPair1(b)));
  const semi1  = sortedR2[0];
  const semi2  = sortedR2[1];
  const finals = round3Series[0];
  const connSide: "left" | "right" = isRight ? "left" : "right";

  return (
    <div className={`flex-1 min-w-0 flex items-stretch ${isRight ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`${COL_W} flex flex-col justify-around flex-shrink-0`}>
        <div className="space-y-2">
          {pair1.length > 0
            ? pair1.map((s) => <SeriesCard key={s.id} series={s} compact onClick={() => onSeriesClick(s)} prediction={predictions?.[s.id]} />)
            : <TBDCard />}
        </div>
        <div className="h-3 flex-shrink-0" />
        <div className="space-y-2">
          {pair2.length > 0
            ? pair2.map((s) => <SeriesCard key={s.id} series={s} compact onClick={() => onSeriesClick(s)} prediction={predictions?.[s.id]} />)
            : <TBDCard />}
        </div>
      </div>
      <RoundConnector pairs={2} side={connSide} />
      <div className={`${COL_W} flex flex-col justify-around gap-3 flex-shrink-0`}>
        {semi1 ? <SeriesCard series={semi1} compact onClick={() => onSeriesClick(semi1)} prediction={predictions?.[semi1.id]} /> : <TBDCard />}
        {semi2 ? <SeriesCard series={semi2} compact onClick={() => onSeriesClick(semi2)} prediction={predictions?.[semi2.id]} /> : <TBDCard />}
      </div>
      <RoundConnector pairs={1} side={connSide} />
      <div className={`${COL_W} flex flex-col justify-center flex-shrink-0`}>
        {finals ? <SeriesCard series={finals} onClick={() => onSeriesClick(finals)} prediction={predictions?.[finals.id]} /> : <TBDCard />}
      </div>
      <div className="flex-1 self-stretch relative">
        <svg className="absolute inset-0 w-full h-full">
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#52525b" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

// ─── Desktop bracket ──────────────────────────────────────────────────────────

export function DesktopBracket({ bracket, onSeriesClick, predictions }: { bracket: Series[]; onSeriesClick: (s: Series) => void; predictions?: Record<string, string> }) {
  const by = (r: number, conf?: "east" | "west") =>
    bracket.filter((s) => s.round === r && (!conf || s.conference?.toLowerCase().includes(conf)));
  const finalsGame = by(4)[0];

  const ConfHeaders = ({ reversed }: { reversed: boolean }) => (
    <div className={`flex-1 min-w-0 flex items-center ${reversed ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`${COL_W} flex-shrink-0 text-center`}>
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider leading-none">{ROUND_LABELS_SHORT[1]}</span>
      </div>
      <div className="w-5 flex-shrink-0" />
      <div className={`${COL_W} flex-shrink-0 text-center`}>
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider leading-none">{ROUND_LABELS_SHORT[2]}</span>
      </div>
      <div className="w-5 flex-shrink-0" />
      <div className={`${COL_W} flex-shrink-0 text-center`}>
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider leading-none">{ROUND_LABELS_SHORT[3]}</span>
      </div>
      <div className="flex-1 min-w-0" />
    </div>
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ouest</span>
          </div>
          <div className="flex-shrink-0 w-[160px]" />
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Est</span>
            <div className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
          </div>
        </div>
        <div className="flex items-center mb-2">
          <ConfHeaders reversed={false} />
          <div className="flex-shrink-0 w-[160px] flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80 flex-shrink-0" />
            <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest leading-none">NBA Finals</span>
          </div>
          <ConfHeaders reversed={true} />
        </div>
        <div className="flex items-stretch">
          <ConferenceBracketGrid round1Series={by(1, "west")} round2Series={by(2, "west")} round3Series={by(3, "west")} onSeriesClick={onSeriesClick} isRight={false} predictions={predictions} />
          <div className="flex-shrink-0 w-[160px] relative flex flex-col justify-center">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="0%" y1="50%" x2="7.5%" y2="50%" stroke="#52525b" strokeWidth="1.5" />
              <line x1="92.5%" y1="50%" x2="100%" y2="50%" stroke="#52525b" strokeWidth="1.5" />
            </svg>
            <div className="px-3 relative z-10">
              {finalsGame ? <SeriesCard series={finalsGame} onClick={() => onSeriesClick(finalsGame)} prediction={predictions?.[finalsGame.id]} /> : <TBDCard />}
            </div>
          </div>
          <ConferenceBracketGrid round1Series={by(1, "east")} round2Series={by(2, "east")} round3Series={by(3, "east")} onSeriesClick={onSeriesClick} isRight={true} predictions={predictions} />
        </div>
      </div>
    </div>
  );
}

// ─── Mobile bracket ───────────────────────────────────────────────────────────

export function MobileBracket({ bracket, onSeriesClick, predictions }: { bracket: Series[]; onSeriesClick: (s: Series) => void; predictions?: Record<string, string> }) {
  const unknown = bracket.filter((s) => s.round === null);
  return (
    <div className="space-y-8">
      {[1, 2, 3, 4].map((round) => {
        const series = bracket.filter((s) => s.round === round);
        if (series.length === 0) return null;
        const sorted = round === 1 ? [...series].sort((a, b) => bracketPos(a) - bracketPos(b)) : series;
        return (
          <section key={round}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-zinc-400">{round}</span>
              </div>
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">{ROUND_LABELS[round]}</h2>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sorted.map((s) => <SeriesCard key={s.id} series={s} onClick={() => onSeriesClick(s)} prediction={predictions?.[s.id]} />)}
            </div>
          </section>
        );
      })}
      {unknown.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Autres séries</h2>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unknown.map((s) => <SeriesCard key={s.id} series={s} onClick={() => onSeriesClick(s)} prediction={predictions?.[s.id]} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Series modal ─────────────────────────────────────────────────────────────

export function SeriesModal({ series, onClose }: { series: Series; onClose: () => void }) {
  const sorted = [...series.games].sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
  const finalGames = sorted.filter((g) => g.status === "FINAL");
  const ifNecGames = sorted.filter((g) => g.isIfNecessary && g.status === "SCHEDULED");
  const isCompleted = series.status === "COMPLETED";
  const logo1 = getTeamLogo(series.team1.abbreviation);
  const logo2 = getTeamLogo(series.team2.abbreviation);
  const t1Won = isCompleted && series.winnerId === series.team1.id;
  const t2Won = isCompleted && series.winnerId === series.team2.id;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-0.5">
              {series.round ? ROUND_LABELS[series.round] : "Playoffs"}
              {series.conference && series.conference !== "Finals" ? ` · Conf. ${series.conference}` : ""}
            </p>
            <h2 className="text-base font-bold text-white">
              {series.team1.city} {series.team1.name} <span className="text-zinc-500 font-normal">vs</span> {series.team2.city} {series.team2.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-5 bg-zinc-800/40 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-14 h-14 flex items-center justify-center">
                {logo1
                  ? <Image src={logo1} alt={series.team1.abbreviation} width={52} height={52} className="object-contain" />
                  : <div className="w-14 h-14 bg-zinc-700 rounded-full flex items-center justify-center"><span className="text-zinc-300 font-bold text-sm">{series.team1.abbreviation}</span></div>}
              </div>
              <div className="text-center leading-tight">
                {series.team1Seed && <span className="text-[10px] text-zinc-600 font-bold">#{series.team1Seed} </span>}
                <span className="text-sm font-bold text-white">{series.team1.abbreviation}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-black tabular-nums ${t1Won ? "text-green-400" : isCompleted ? "text-zinc-600" : "text-white"}`}>{series.team1Wins}</span>
              <span className="text-zinc-600 text-2xl font-bold">-</span>
              <span className={`text-4xl font-black tabular-nums ${t2Won ? "text-green-400" : isCompleted ? "text-zinc-600" : "text-white"}`}>{series.team2Wins}</span>
            </div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-14 h-14 flex items-center justify-center">
                {logo2
                  ? <Image src={logo2} alt={series.team2.abbreviation} width={52} height={52} className="object-contain" />
                  : <div className="w-14 h-14 bg-zinc-700 rounded-full flex items-center justify-center"><span className="text-zinc-300 font-bold text-sm">{series.team2.abbreviation}</span></div>}
              </div>
              <div className="text-center leading-tight">
                {series.team2Seed && <span className="text-[10px] text-zinc-600 font-bold">#{series.team2Seed} </span>}
                <span className="text-sm font-bold text-white">{series.team2.abbreviation}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center py-10"><p className="text-zinc-500 text-sm">Aucun match programmé</p></div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {sorted.map((game, idx) => {
                const isHome1 = game.homeTeamId === series.team1.id;
                const homeTeam = isHome1 ? series.team1 : series.team2;
                const awayTeam = isHome1 ? series.team2 : series.team1;
                const gameDate = new Date(game.gameDate);
                const isFinal = game.status === "FINAL";
                const isScheduled = game.status === "SCHEDULED";
                const isCancelled = game.status === "CANCELLED";
                const homeWon = isFinal && game.winnerId === game.homeTeamId;
                const awayWon = isFinal && game.winnerId === game.awayTeamId;
                return (
                  <div key={game.id} className={`px-4 py-3 ${isCancelled ? "opacity-30" : ""} ${game.isIfNecessary && !isFinal ? "bg-amber-500/5" : ""}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Game {idx + 1}</span>
                      <span className="text-zinc-700 text-[10px]">·</span>
                      <span className="text-[10px] text-zinc-600">{format(gameDate, "d MMM yyyy", { locale: fr })}</span>
                      {game.isIfNecessary && !isCancelled && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400/80 rounded font-bold uppercase tracking-wide">If Nec.</span>
                      )}
                      {isCancelled && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-700/40 text-zinc-500 rounded font-medium flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" /> Annulé
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 flex-1 ${awayWon ? "" : isFinal ? "opacity-40" : ""}`}>
                        <span className={`text-sm font-bold truncate ${awayWon ? "text-white" : "text-zinc-400"}`}>{awayTeam.abbreviation}</span>
                        <span className="text-[10px] text-zinc-600">@</span>
                        <span className={`text-sm font-bold truncate ${homeWon ? "text-white" : "text-zinc-400"}`}>{homeTeam.abbreviation}</span>
                      </div>
                      {isFinal ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-base font-black tabular-nums w-8 text-right ${awayWon ? "text-white" : "text-zinc-600"}`}>{game.awayScore}</span>
                          <span className="text-zinc-700 text-xs">–</span>
                          <span className={`text-base font-black tabular-nums w-8 ${homeWon ? "text-white" : "text-zinc-600"}`}>{game.homeScore}</span>
                          {(homeWon || awayWon) && <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70 flex-shrink-0 ml-1" />}
                        </div>
                      ) : isScheduled ? (
                        <div className="flex items-center gap-1 text-zinc-600 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[11px]">{formatDistanceToNow(gameDate, { addSuffix: true, locale: fr })}</span>
                        </div>
                      ) : !isCancelled ? (
                        <span className="text-[11px] text-zinc-500 uppercase flex-shrink-0">{game.status}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{finalGames.length} match{finalGames.length !== 1 ? "s" : ""} joué{finalGames.length !== 1 ? "s" : ""}</span>
          {ifNecGames.length > 0 && <span className="text-xs text-amber-500/70">{ifNecGames.length} match{ifNecGames.length !== 1 ? "s" : ""} if necessary</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Play-In game card ────────────────────────────────────────────────────────

export function PlayInGameCard({ game, seedMap, neutralResult = false }: { game: PlayInGame | null; seedMap: Record<string, number>; neutralResult?: boolean }) {
  if (!game) {
    return (
      <div className="rounded-xl border border-zinc-800/60 border-dashed min-h-[68px] flex items-center justify-center">
        <span className="text-[11px] text-zinc-700 font-medium tracking-wide">TBD</span>
      </div>
    );
  }
  const isFinal = game.status === "FINAL";
  const homeWon = isFinal && game.winnerId === game.homeTeamId;
  const awayWon = isFinal && game.winnerId === game.awayTeamId;
  const homeSeedRaw = seedMap[game.homeTeamId] ?? null;
  const awaySeedRaw = seedMap[game.awayTeamId] ?? null;
  const topIsHome = (homeSeedRaw ?? 99) < (awaySeedRaw ?? 99);
  const rows = [
    { team: topIsHome ? game.homeTeam : game.awayTeam, seed: topIsHome ? homeSeedRaw : awaySeedRaw, score: topIsHome ? game.homeScore : game.awayScore, won: topIsHome ? homeWon : awayWon, lost: topIsHome ? awayWon : homeWon },
    { team: topIsHome ? game.awayTeam : game.homeTeam, seed: topIsHome ? awaySeedRaw : homeSeedRaw, score: topIsHome ? game.awayScore : game.homeScore, won: topIsHome ? awayWon : homeWon, lost: topIsHome ? homeWon : awayWon },
  ];
  const renderRow = (team: TeamInfo, seed: number | null, score: number | null, won: boolean, lost: boolean) => {
    const logo = getTeamLogo(team.abbreviation);
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${!neutralResult && lost ? "opacity-40" : ""}`}>
        <span className="text-[10px] font-bold text-zinc-600 w-3 text-center flex-shrink-0">{seed ?? ""}</span>
        {logo
          ? <Image src={logo} alt={team.abbreviation} width={20} height={20} className="object-contain flex-shrink-0" />
          : <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0"><span className="text-[7px] font-bold text-zinc-400">{team.abbreviation.slice(0, 3)}</span></div>}
        <span className={`text-xs font-semibold flex-1 truncate ${!neutralResult && won ? "text-white" : "text-zinc-300"}`}>{team.abbreviation}</span>
        {isFinal && score !== null && <span className={`text-sm font-black tabular-nums flex-shrink-0 ${!neutralResult && won ? "text-white" : "text-zinc-400"}`}>{score}</span>}
        {!isFinal && game.status === "SCHEDULED" && <span className="text-[10px] text-zinc-600 flex-shrink-0">{format(new Date(game.gameDate), "d MMM", { locale: fr })}</span>}
      </div>
    );
  };
  return (
    <div className={`rounded-xl border overflow-hidden ${isFinal ? "border-zinc-600/50 bg-zinc-800/40" : "border-zinc-700/50 bg-zinc-800/50"}`}>
      {renderRow(rows[0].team, rows[0].seed, rows[0].score, rows[0].won, rows[0].lost)}
      <div className="h-px bg-zinc-700/60" />
      {renderRow(rows[1].team, rows[1].seed, rows[1].score, rows[1].won, rows[1].lost)}
    </div>
  );
}

// ─── Play-In connectors ───────────────────────────────────────────────────────

export function PlayInConnector({ side }: { side: "left" | "right" }) {
  const pIn  = side === "right" ? "0%"   : "100%";
  const pOut = side === "right" ? "100%" : "0%";
  const pBar = "50%";
  const lp   = { stroke: "#52525b", strokeWidth: "1.5" };
  return (
    <div className="w-5 flex-shrink-0 self-stretch relative">
      <svg className="absolute inset-0 w-full h-full">
        <line x1={pIn}  y1="24%" x2={pOut} y2="24%" {...lp} />
        <line x1={pBar} y1="24%" x2={pBar} y2="50%" {...lp} />
        <line x1={pIn}  y1="75%" x2={pBar} y2="75%" {...lp} />
        <line x1={pBar} y1="75%" x2={pBar} y2="50%" {...lp} />
        <line x1={pBar} y1="50%" x2={pOut} y2="50%" {...lp} />
      </svg>
    </div>
  );
}

export function PlayInToPlayoffConnector({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  const x = (v: number) => isLeft ? `${100 - v}%` : `${v}%`;
  const lp = { stroke: "#52525b", strokeWidth: "1.5" };
  return (
    <div className="w-5 flex-shrink-0 self-stretch relative">
      <svg className="absolute inset-0 w-full h-full">
        <line x1={x(0)}  y1="24%" x2={x(40)} y2="24%" {...lp} />
        <line x1={x(40)} y1="24%" x2={x(40)} y2="11%" {...lp} />
        <line x1={x(40)} y1="11%" x2={x(100)} y2="11%" {...lp} />
        <line x1={x(0)}  y1="50%" x2={x(65)} y2="50%" {...lp} />
        <line x1={x(65)} y1="50%" x2={x(65)} y2="61%" {...lp} />
        <line x1={x(65)} y1="61%" x2={x(100)} y2="61%" {...lp} />
      </svg>
    </div>
  );
}

// ─── Play-In conference ───────────────────────────────────────────────────────

export function PlayInConference({ label, conf, seedMap, isRight = false, series1v8 = null, series2v7 = null, onSeriesClick, predictions }: {
  label: string; conf: PlayInConf | null; seedMap: Record<string, number>; isRight?: boolean;
  series1v8?: Series | null; series2v7?: Series | null; onSeriesClick: (s: Series) => void; predictions?: Record<string, string>;
}) {
  const connSide: "left" | "right" = isRight ? "left" : "right";
  const CW = "w-[148px]";
  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 mb-2 ${isRight ? "justify-end" : ""}`}>
        <div className="w-2 h-2 rounded-full bg-zinc-600" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`flex items-center mb-2 ${isRight ? "flex-row-reverse" : ""}`}>
        <div className={`${CW} flex-shrink-0 ${isRight ? "text-right pr-2" : "text-left pl-2"}`}>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">1<sup>er</sup> / 2<sup>e</sup> match</span>
        </div>
        <div className="w-5 flex-shrink-0" />
        <div className={`${CW} flex-shrink-0 ${isRight ? "text-right pr-2" : "text-left pl-2"}`}>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Décisif</span>
        </div>
        <div className="w-5 flex-shrink-0" />
        <div className={`${CW} flex-shrink-0 ${isRight ? "text-right pr-2" : "text-left pl-2"}`}>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">1<sup>er</sup> Tour</span>
        </div>
      </div>
      <div className={`flex items-stretch ${isRight ? "flex-row-reverse" : ""}`}>
        <div className={`${CW} flex flex-col justify-around flex-shrink-0 min-h-[300px]`}>
          <div><PlayInGameCard game={conf?.game78 ?? null} seedMap={seedMap} /></div>
          <div>
            <PlayInGameCard game={conf?.game910 ?? null} seedMap={seedMap} />
            <p className={`text-[9px] font-bold text-red-500/70 uppercase tracking-wider mt-1.5 ${isRight ? "text-right pr-0.5" : "pl-0.5"}`}>
              ✗ Défaite → 10<sup>e</sup> · Éliminé
            </p>
          </div>
        </div>
        <PlayInConnector side={connSide} />
        <div className={`${CW} flex flex-col justify-center flex-shrink-0 relative`}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="0%" y1="24%" x2="100%" y2="24%" stroke="#52525b" strokeWidth="1.5" />
          </svg>
          <div className="relative">
            <PlayInGameCard game={conf?.gameDeciding ?? null} seedMap={seedMap} />
            <p className={`text-[9px] font-bold text-red-500/70 uppercase tracking-wider mt-1.5 ${isRight ? "text-right pr-0.5" : "pl-0.5"}`}>
              ✗ Défaite → 9<sup>e</sup> · Éliminé
            </p>
          </div>
        </div>
        <PlayInToPlayoffConnector side={connSide} />
        <div className={`${CW} flex flex-col flex-shrink-0`}>
          <div>{series2v7 ? <SeriesCard series={series2v7} compact hideScore neutralResult onClick={() => onSeriesClick(series2v7!)} prediction={predictions?.[series2v7.id]} /> : <TBDCard />}</div>
          <div className="flex-1" />
          <div>{series1v8 ? <SeriesCard series={series1v8} compact hideScore neutralResult onClick={() => onSeriesClick(series1v8!)} prediction={predictions?.[series1v8.id]} /> : <TBDCard />}</div>
          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}

// ─── Play-In section (full West + East) ──────────────────────────────────────

export function PlayInSection({ data, bracket, onSeriesClick, predictions }: { data: PlayInData; bracket: Series[]; onSeriesClick: (s: Series) => void; predictions?: Record<string, string> }) {
  const r1 = (conf: string, minSeed: number): Series | null =>
    bracket.find((s) => s.round === 1 && s.conference === conf && Math.min(s.team1Seed ?? 99, s.team2Seed ?? 99) === minSeed) ?? null;
  const west1v8 = r1("West", 1); const west2v7 = r1("West", 2);
  const east1v8 = r1("East", 1); const east2v7 = r1("East", 2);

  return (
    <div className="mt-14 pt-10 border-t border-zinc-800/60">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Play-In Tournament</h2>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <div className="hidden lg:flex items-start gap-12 justify-center">
        <PlayInConference label="Ouest" conf={data.west} seedMap={data.seedMap} isRight={false} series1v8={west1v8} series2v7={west2v7} onSeriesClick={onSeriesClick} predictions={predictions} />
        <div className="w-px self-stretch bg-zinc-800 flex-shrink-0" />
        <PlayInConference label="Est" conf={data.east} seedMap={data.seedMap} isRight={true} series1v8={east1v8} series2v7={east2v7} onSeriesClick={onSeriesClick} predictions={predictions} />
      </div>
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-8">
        <PlayInConference label="Conférence Ouest" conf={data.west} seedMap={data.seedMap} series1v8={west1v8} series2v7={west2v7} onSeriesClick={onSeriesClick} predictions={predictions} />
        <PlayInConference label="Conférence Est" conf={data.east} seedMap={data.seedMap} series1v8={east1v8} series2v7={east2v7} onSeriesClick={onSeriesClick} predictions={predictions} />
      </div>
    </div>
  );
}

// ─── No-spoil gate ────────────────────────────────────────────────────────────

export function SpoilGate({ onReveal }: { onReveal: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 px-8 py-8 bg-zinc-900/95 rounded-2xl border border-zinc-700/80 shadow-2xl backdrop-blur-sm max-w-sm w-full mx-4 text-center">
        <div className="p-4 bg-zinc-800 rounded-2xl"><EyeOff className="w-10 h-10 text-zinc-400" /></div>
        <div>
          <p className="text-white font-bold text-lg mb-1">Contenu masqué</p>
          <p className="text-zinc-500 text-sm">Le bracket et les résultats des séries sont cachés.</p>
        </div>
        <button onClick={onReveal} className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-xl transition-colors">
          <Eye className="w-4 h-4" />
          Afficher le contenu
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Spoils</span>
          </span>
        </button>
      </div>
    </div>
  );
}
