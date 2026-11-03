"use client";

import { Check, Lock, Clock, Target, Star, Zap, BarChart3, Loader2, SlidersHorizontal } from "lucide-react";
import type { BetGame, BetTeam } from "@/types/bet";
import { isBettable, marginLabel } from "@/types/bet";
import { formatParisTime, formatCountdown } from "@/lib/game-night";
import { TeamLogo } from "./team-logo";

// ─── Étiquettes du match ─────────────────────────────────────────────────────

const CUP_LABEL: Record<string, string> = {
  GroupPlay: "NBA Cup · Poules",
  Quarterfinal: "NBA Cup · Quart",
  Semifinal: "NBA Cup · Demie",
  Championship: "NBA Cup · Finale",
};

export function GameTags({ game }: { game: BetGame }) {
  const tags: { label: string; cls: string }[] = [];
  if (game.nbaCupRound) tags.push({ label: CUP_LABEL[game.nbaCupRound] ?? "NBA Cup", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" });
  if (game.seasonType === "Play-In Tournament") tags.push({ label: "Play-in", cls: "bg-[#dcff50]/10 text-[#dcff50] border-[#dcff50]/20" });
  if (game.seasonType === "Playoffs") tags.push({ label: game.gameNumber ? `Playoffs · Match ${game.gameNumber}` : "Playoffs", cls: "bg-[#ff5050]/10 text-[#ff5050] border-[#ff5050]/20" });
  if (game.isIfNecessary) tags.push({ label: "Si nécessaire", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" });
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t.label} className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${t.cls}`}>{t.label}</span>
      ))}
    </div>
  );
}

// ─── Clôture des paris ───────────────────────────────────────────────────────

export function DeadlineChip({ game, now }: { game: BetGame; now: number }) {
  if (game.status !== "SCHEDULED") return null;
  const left = new Date(game.predictionDeadline).getTime() - now;
  if (left <= 0 || game.isIfNecessary) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
        <Lock className="h-3 w-3" /> Paris fermés
      </span>
    );
  }
  const urgent = left <= 15 * 60_000;
  const soon = left <= 60 * 60_000;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        urgent ? "bg-red-500/15 text-red-400" : soon ? "bg-amber-500/15 text-amber-400" : "bg-zinc-800 text-zinc-300"
      }`}
      title={`Paris ouverts jusqu'à ${formatParisTime(game.predictionDeadline)} (heure de Paris)`}
    >
      <Clock className="h-3 w-3" />
      Clôture {formatParisTime(game.predictionDeadline)} · {formatCountdown(left)}
    </span>
  );
}

// ─── Carte ───────────────────────────────────────────────────────────────────

interface GameBetCardProps {
  game: BetGame;
  now: number;
  noSpoil: boolean;
  saving?: boolean;
  onQuickPick?: (game: BetGame, teamId: string) => void;
  onOpen?: (game: BetGame) => void;
  onShowBoxscore?: (game: BetGame) => void;
}

export function GameBetCard({ game, now, noSpoil, saving, onQuickPick, onOpen, onShowBoxscore }: GameBetCardProps) {
  const bettable = isBettable(game, now);
  const isLive   = game.status === "LIVE";
  const isFinal  = game.status === "FINAL";
  const isOff    = game.status === "POSTPONED" || game.status === "CANCELLED";
  const showScore = (isLive || isFinal) && !noSpoil && game.homeScore !== null && game.awayScore !== null;
  const p = game.prediction;
  const graded = isFinal && p && (p.result === "WON" || p.result === "LOST");
  const showResult = graded && !noSpoil;
  // Le bilan V-D inclut déjà le résultat d'un match terminé : masqué en No Spoil
  const hideRecord = noSpoil && (isLive || isFinal);

  const winnerId = showScore && isFinal
    ? (game.homeScore! > game.awayScore! ? game.homeTeam.id : game.awayTeam.id)
    : null;

  const border =
    bettable && !p ? "border-[#ff5050]/30 hover:border-[#ff5050]/50" :
    showResult && p?.result === "WON" ? "border-green-500/30" :
    showResult && p?.result === "LOST" ? "border-red-500/20" :
    "border-zinc-800 hover:border-zinc-700";

  return (
    <div className={`flex flex-col rounded-2xl border bg-zinc-900/70 transition-colors ${border}`}>
      {/* En-tête : horaire / statut + clôture / résultat */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold uppercase text-red-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              {game.currentPeriod
                ? `${game.currentPeriod > 4 ? `Prol. ${game.currentPeriod - 4}` : `Q${game.currentPeriod}`}${game.gameClock && game.gameClock !== "0.0" ? ` · ${game.gameClock}` : ""}`
                : "En direct"}
            </span>
          ) : isFinal ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Terminé</span>
          ) : isOff ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{game.status === "POSTPONED" ? "Reporté" : "Annulé"}</span>
          ) : (
            <span className="text-base font-bold text-white">{formatParisTime(game.gameDate)}</span>
          )}
        </div>
        {showResult && p ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.result === "WON" ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
            {p.pointsEarned > 0 ? `+${p.pointsEarned} pts` : "0 pt"}
          </span>
        ) : (
          <DeadlineChip game={game} now={now} />
        )}
      </div>

      <div className="px-4 pt-2"><GameTags game={game} /></div>

      {/* Équipes */}
      <div className="space-y-1.5 px-3 py-3">
        {[game.awayTeam, game.homeTeam].map((team, i) => (
          <TeamRow
            key={team.id}
            team={hideRecord ? { ...team, record: null } : team}
            side={i === 0 ? "away" : "home"}
            score={showScore ? (i === 0 ? game.awayScore : game.homeScore) : null}
            picked={p?.predictedTeamId === team.id}
            outcome={showResult && p?.predictedTeamId === team.id ? (p.result === "WON" ? "won" : "lost") : null}
            isWinner={winnerId === null ? null : winnerId === team.id}
            clickable={bettable && !!onQuickPick && !saving}
            saving={!!saving && p?.predictedTeamId === team.id}
            onClick={() => onQuickPick?.(game, team.id)}
          />
        ))}
      </div>

      {/* Pied */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800/80 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {showResult && p ? (
            <ResultChips game={game} />
          ) : p ? (
            <>
              {p.predictedScoreMargin && <Chip icon={<Target className="h-3 w-3" />}>{marginLabel(p.predictedScoreMargin)}</Chip>}
              {p.predictedTopScorer && <Chip icon={<Star className="h-3 w-3" />}>{p.predictedTopScorer.fullName}</Chip>}
              {!p.predictedScoreMargin && !p.predictedTopScorer && (
                <span className="text-xs text-zinc-500">{bettable ? "Bonus non joués" : "Sans bonus"}</span>
              )}
            </>
          ) : bettable ? (
            <span className="text-xs font-medium text-[#ff5050]">Touche une équipe pour parier</span>
          ) : isFinal || isLive ? (
            <span className="text-xs text-zinc-500">Pas de prono</span>
          ) : (
            <span className="text-xs text-zinc-500">{isOff ? "Pronos annulés" : "Pas de prono"}</span>
          )}
        </div>

        {bettable && onOpen ? (
          <button
            onClick={() => onOpen(game)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {p ? "Bonus" : "Parier"}
          </button>
        ) : isFinal && onShowBoxscore ? (
          <button
            onClick={() => onShowBoxscore(game)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Stats
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TeamRow({ team, side, score, picked, outcome, isWinner, clickable, saving, onClick }: {
  team: BetTeam; side: "home" | "away"; score: number | null; picked: boolean;
  outcome: "won" | "lost" | null; isWinner: boolean | null; clickable: boolean; saving: boolean; onClick: () => void;
}) {
  const dim = isWinner === false; // match terminé, équipe battue
  const ring =
    outcome === "won" ? "bg-green-500/10 ring-1 ring-green-500/40" :
    outcome === "lost" ? "bg-red-500/5 ring-1 ring-red-500/30" :
    picked ? "bg-[#5096ff]/10 ring-1 ring-[#5096ff]/50" :
    clickable ? "hover:bg-zinc-800/70" : "";
  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors disabled:cursor-default ${ring}`}
    >
      <TeamLogo abbreviation={team.abbreviation} size={34} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${dim ? "text-zinc-400" : "text-white"}`}>
          {team.name}
        </span>
        <span className="block text-[11px] text-zinc-500">
          {team.abbreviation}{team.record ? ` · ${team.record}` : ""} · {side === "home" ? "dom." : "ext."}
        </span>
      </span>
      {picked && (
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          outcome === "won" ? "bg-green-500/20 text-green-400" : outcome === "lost" ? "bg-red-500/15 text-red-400" : "bg-[#5096ff]/20 text-[#5096ff]"
        }`}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Ton choix
        </span>
      )}
      {score !== null && (
        <span className={`w-9 text-right text-lg font-bold tabular-nums ${dim ? "text-zinc-500" : "text-white"}`}>{score}</span>
      )}
    </button>
  );
}

function Chip({ icon, children, tone = "default" }: { icon?: React.ReactNode; children: React.ReactNode; tone?: "default" | "win" | "miss" | "combo" }) {
  const cls =
    tone === "win" ? "bg-green-500/10 text-green-400" :
    tone === "miss" ? "bg-zinc-800/80 text-zinc-500 line-through decoration-zinc-600" :
    tone === "combo" ? "bg-purple-500/15 text-purple-300" :
    "bg-zinc-800 text-zinc-300";
  return (
    <span className={`inline-flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {icon}{children}
    </span>
  );
}

function ResultChips({ game }: { game: BetGame }) {
  const p = game.prediction!;
  const base = p.result === "WON" ? 10 : 0;
  return (
    <>
      <Chip tone={base ? "win" : "miss"}>Équipe {base ? "+10" : ""}</Chip>
      {p.predictedScoreMargin && (
        <Chip icon={<Target className="h-3 w-3" />} tone={p.marginBonusPoints ? "win" : "miss"}>
          {marginLabel(p.predictedScoreMargin)} {p.marginBonusPoints ? `+${p.marginBonusPoints}` : ""}
        </Chip>
      )}
      {p.predictedTopScorer && (
        <Chip icon={<Star className="h-3 w-3" />} tone={p.topScorerBonusPoints ? "win" : "miss"}>
          {p.predictedTopScorer.fullName} {p.topScorerBonusPoints ? `+${p.topScorerBonusPoints}` : ""}
        </Chip>
      )}
      {p.comboBonusPoints > 0 && <Chip icon={<Zap className="h-3 w-3" />} tone="combo">Combo +{p.comboBonusPoints}</Chip>}
    </>
  );
}
