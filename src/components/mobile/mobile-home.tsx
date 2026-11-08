"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronDown, ChevronRight, Eye, EyeOff, Lock, Medal, Moon, Sparkles, Trophy, Zap } from "lucide-react";
import type { BetGame } from "@/types/bet";
import { formatCountdown, formatNight, formatParisTime } from "@/lib/game-night";
import { getSeasonLabel } from "@/types/season";
import type { useBetGames } from "@/components/bets/use-bet-games";
import { GameBetCard } from "@/components/bets/game-bet-card";
import { TeamLogo } from "@/components/bets/team-logo";
import type { HomeData } from "@/components/dashboard/dashboard-page";
import { Avatar, fmtNumber, ordinal, ProgressRing } from "./ui";

interface MobileHomeProps {
  data: HomeData;
  firstName: string;
  userId: string;
  games: BetGame[];
  missing: BetGame[];
  bettable: BetGame[];
  predicted: number;
  now: number;
  noSpoil: boolean;
  onToggleNoSpoil: () => void;
  bets: ReturnType<typeof useBetGames>;
}

/**
 * Accueil sur mobile, pensé comme un écran de jeu : la nuit en cours et un gros bouton « Jouer »,
 * les matchs à toucher, le résultat d'hier en une ligne, la course au classement.
 */
export function MobileHome(props: MobileHomeProps) {
  const { data, firstName, userId, games, now, noSpoil, onToggleNoSpoil, bets } = props;
  const preseason = data.preseason;

  return (
    <div className="space-y-5 px-4 pt-4 md:hidden">
      {/* Salut + No Spoil */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight text-white">Salut {firstName}</h1>
          <p className="text-xs text-zinc-500">Saison {getSeasonLabel(data.season)}</p>
        </div>
        <button
          type="button"
          onClick={onToggleNoSpoil}
          className={`flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors active:scale-95 ${
            noSpoil ? "border-[#ff5050]/30 bg-[#ff5050]/10 text-[#ff5050]" : "border-zinc-800 bg-zinc-900 text-zinc-300"
          }`}
          aria-label={noSpoil ? "Afficher les scores" : "Masquer les scores"}
        >
          {noSpoil ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {noSpoil ? "No Spoil" : "Scores"}
        </button>
      </div>

      <TonightHero {...props} />

      {/* Paris de début de saison */}
      {preseason && preseason.open && preseason.done < preseason.total && (
        <Link
          href="/pronos/preseason"
          className="flex items-center gap-3 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-amber-500/0 p-4 active:scale-[0.98] transition-transform"
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400/20">
            <Medal className="h-6 w-6 text-amber-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-white">Paris de saison · {preseason.done}/{preseason.total}</p>
            <p className="text-xs text-zinc-400">
              Ferment dans <b className="text-amber-300">{formatCountdown(new Date(preseason.deadline).getTime() - now)}</b>
            </p>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-amber-400" />
        </Link>
      )}

      {/* Matchs de la nuit */}
      {games.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-baseline justify-between px-1">
            <h2 className="text-lg font-black text-white">Les matchs</h2>
            <Link href="/matchs" className="flex items-center gap-1 text-xs font-semibold text-[#5096ff]">
              Calendrier <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {games.map((g) => (
              <GameBetCard
                key={g.id}
                game={g}
                now={now}
                noSpoil={noSpoil}
                saving={bets.savingId === g.id}
                onQuickPick={bets.quickPick}
                onOpen={bets.openGame}
                onShowBoxscore={bets.showBoxscore}
              />
            ))}
          </div>
        </section>
      )}

      {data.lastNight && data.lastNight.games.length > 0 && (
        <LastNightCard date={data.lastNight.date} games={data.lastNight.games} noSpoil={noSpoil} now={now} />
      )}

      <RaceCard data={data} userId={userId} />
    </div>
  );
}

// ─── La nuit en cours ────────────────────────────────────────────────────────

function TonightHero({ data, games, missing, bettable, predicted, now, bets }: MobileHomeProps) {
  const night = formatNight(data.tonight.date, new Date(now));
  const live = games.filter((g) => g.status === "LIVE").length;
  const finals = games.filter((g) => g.status === "FINAL").length;
  const next = missing[0] ?? [...bettable].sort((a, b) => a.predictionDeadline.localeCompare(b.predictionDeadline))[0];
  const left = next ? new Date(next.predictionDeadline).getTime() - now : 0;

  let title: string;
  let subtitle: React.ReactNode;
  let action: React.ReactNode;

  if (games.length === 0) {
    const nn = data.nextNight;
    title = "Pas de match cette nuit";
    subtitle = nn
      ? <>Prochains : <span className="text-white">{formatNight(nn.date).short}</span> · {nn.games} match{nn.games > 1 ? "s" : ""}{nn.firstGameAt && <> · {formatParisTime(nn.firstGameAt)}</>}</>
      : "Aucun match programmé pour le moment.";
    action = (
      <Link href="/matchs" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800 text-base font-black text-white active:scale-[0.98] transition-transform">
        <CalendarDays className="h-5 w-5" /> Voir le calendrier
      </Link>
    );
  } else if (missing.length > 0) {
    title = missing.length === 1 ? "1 pari à faire" : `${missing.length} paris à faire`;
    subtitle = (
      <>1re clôture dans <b className={left <= 60 * 60_000 ? "text-[#ff5050]" : "text-amber-300"}>{formatCountdown(left)}</b></>
    );
    action = (
      <button
        type="button"
        onClick={() => bets.openSheet(missing, 0)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6a5a] to-[#ff3b3b] text-base font-black uppercase tracking-wide text-white shadow-lg shadow-[#ff5050]/30 active:scale-[0.98] transition-transform"
      >
        <Zap className="h-5 w-5 fill-white" />
        Jouer · {missing.length} pari{missing.length > 1 ? "s" : ""}
      </button>
    );
  } else if (bettable.length > 0) {
    title = "Tout est fait !";
    subtitle = next ? <>Modifiable jusqu&apos;à {formatParisTime(next.predictionDeadline)}</> : "Modifiable jusqu'au coup d'envoi";
    action = (
      <button
        type="button"
        onClick={() => bets.openSheet(bettable, 0, "Mes paris de la nuit")}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800 text-base font-black text-white active:scale-[0.98] transition-transform"
      >
        <Sparkles className="h-5 w-5 text-[#dcff50]" /> Ajouter des bonus
      </button>
    );
  } else {
    title = "Paris fermés";
    subtitle = [live && `${live} en direct`, finals && `${finals} terminé${finals > 1 ? "s" : ""}`].filter(Boolean).join(" · ") || "Les matchs vont commencer";
    action = null;
  }

  const allDone = games.length > 0 && missing.length === 0 && bettable.length > 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#0d1526] p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#5096ff]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#ff5050]/10 blur-3xl" />

      <div className="relative">
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#5096ff]">
          <Moon className="h-3.5 w-3.5" /> {night.relative ?? night.short}
          {games.length > 0 && <span className="text-zinc-500">· {games.length} match{games.length > 1 ? "s" : ""}</span>}
        </p>

        <div className="mt-4 flex items-center gap-4">
          {games.length > 0 ? (
            <ProgressRing value={predicted} max={games.length}>
              {allDone ? (
                <Check className="h-7 w-7 stroke-[3] text-[#dcff50]" />
              ) : (
                <span className="text-lg font-black tabular-nums text-white">
                  {predicted}<span className="text-sm text-zinc-500">/{games.length}</span>
                </span>
              )}
            </ProgressRing>
          ) : (
            <span className="flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center rounded-full border-[7px] border-zinc-800">
              <Moon className="h-7 w-7 text-zinc-600" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight text-white">{title}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {games.length > 0 && missing.length === 0 && bettable.length === 0 && <Lock className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />}
              {subtitle}
            </p>
          </div>
        </div>

        {action && <div className="mt-5">{action}</div>}
      </div>
    </section>
  );
}

// ─── Hier soir ───────────────────────────────────────────────────────────────

function LastNightCard({ date, games, noSpoil, now }: { date: string; games: BetGame[]; noSpoil: boolean; now: number }) {
  const [open, setOpen] = useState(false);
  const night = formatNight(date, new Date(now));
  const withBet = games.filter((g) => g.prediction);
  const graded = withBet.filter((g) => g.prediction?.result === "WON" || g.prediction?.result === "LOST");
  const won = graded.filter((g) => g.prediction?.result === "WON").length;
  const points = withBet.reduce((s, g) => s + (g.prediction?.pointsEarned ?? 0), 0);

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left active:bg-zinc-800/40">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-800">
          {open || !noSpoil ? <Trophy className="h-5 w-5 text-[#dcff50]" /> : <EyeOff className="h-5 w-5 text-zinc-500" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-white">{night.relative ?? night.short}</p>
          <p className="text-xs text-zinc-400">
            {noSpoil && !open
              ? "Résultats masqués · touche pour voir"
              : graded.length > 0
                ? <><b className="text-white">{won}/{graded.length}</b> bons pronos</>
                : withBet.length > 0 ? "Résultats en attente" : "Pas de prono"}
          </p>
        </div>
        {(!noSpoil || open) && graded.length > 0 && (
          <span className="rounded-full bg-[#dcff50]/10 px-3 py-1 text-sm font-black tabular-nums text-[#dcff50]">+{points}</span>
        )}
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="divide-y divide-zinc-800/70 border-t border-zinc-800">
          {games.map((g) => <ResultLine key={g.id} game={g} />)}
        </div>
      )}
    </section>
  );
}

function ResultLine({ game }: { game: BetGame }) {
  const p = game.prediction;
  const final = game.status === "FINAL" && game.homeScore !== null && game.awayScore !== null;
  const awayWon = final && game.awayScore! > game.homeScore!;
  const pickedAway = p?.predictedTeamId === game.awayTeam.id;
  const pickedHome = p?.predictedTeamId === game.homeTeam.id;
  const ring = (picked: boolean) =>
    picked ? (p?.result === "WON" ? "ring-2 ring-emerald-500/70" : p?.result === "LOST" ? "ring-2 ring-red-500/50" : "ring-2 ring-[#5096ff]/60") : "";

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <span className={`rounded-full p-0.5 ${ring(pickedAway)}`}><TeamLogo abbreviation={game.awayTeam.abbreviation} size={24} /></span>
      <span className={`w-9 text-sm font-bold ${final && !awayWon ? "text-zinc-500" : "text-white"}`}>{game.awayTeam.abbreviation}</span>
      <span className="flex-1 text-center text-sm tabular-nums text-zinc-400">
        {final ? `${game.awayScore} – ${game.homeScore}` : game.status === "POSTPONED" ? "reporté" : "–"}
      </span>
      <span className={`w-9 text-right text-sm font-bold ${final && awayWon ? "text-zinc-500" : "text-white"}`}>{game.homeTeam.abbreviation}</span>
      <span className={`rounded-full p-0.5 ${ring(pickedHome)}`}><TeamLogo abbreviation={game.homeTeam.abbreviation} size={24} /></span>
      <span className={`w-12 text-right text-xs font-black tabular-nums ${p?.result === "WON" ? "text-emerald-400" : "text-zinc-600"}`}>
        {p && (p.result === "WON" || p.result === "LOST") ? (p.pointsEarned > 0 ? `+${p.pointsEarned}` : "0") : p ? "…" : "–"}
      </span>
    </div>
  );
}

// ─── Course au classement ────────────────────────────────────────────────────

function RaceCard({ data, userId }: { data: HomeData; userId: string }) {
  const { me, top } = data;
  if (top.length === 0) return null;

  let line: string | null = null;
  if (me.rank === 1) {
    const second = top.find((t) => t.userId !== userId);
    line = !second ? "Tu es en tête" : me.points > second.points ? `En tête, ${me.points - second.points} pts d'avance` : "En tête, à égalité";
  } else if (me.rank) {
    const above = top.filter((t) => t.points > me.points).pop();
    if (above) line = `À ${above.points - me.points} pts de ${above.name.split(" ")[0]} (${ordinal(above.rank)})`;
  }

  return (
    <Link href="/classement" className="block rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400/15">
          <Trophy className="h-5 w-5 text-amber-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-white">
            {me.rank ? <>{ordinal(me.rank)} <span className="text-sm font-semibold text-zinc-500">sur {me.totalPlayers}</span></> : "Pas encore classé"}
          </p>
          <p className="truncate text-xs text-zinc-400">{line ?? "Fais tes pronos pour entrer au classement"}</p>
        </div>
        <span className="text-lg font-black tabular-nums text-[#dcff50]">{fmtNumber(me.points)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-zinc-800/80 pt-3">
        <div className="flex -space-x-2">
          {top.slice(0, 3).map((t) => (
            <span key={t.userId} className="rounded-full ring-2 ring-zinc-900">
              <Avatar name={t.name} image={t.image} size={28} />
            </span>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-xs text-zinc-500">
          {top[0].userId === userId ? "Tu mènes la danse" : `${top[0].name.split(" ")[0]} mène avec ${fmtNumber(top[0].points)} pts`}
        </p>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
      </div>
    </Link>
  );
}
