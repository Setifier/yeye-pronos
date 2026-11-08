"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Eye, EyeOff, Lock, Moon, Trophy, Zap,
} from "lucide-react";
import type { BetGame } from "@/types/bet";
import { isBettable, missingBets } from "@/types/bet";
import { formatNight, formatParisTime, formatCountdown, getCurrentNightDate } from "@/lib/game-night";
import { getSeasonLabel } from "@/types/season";
import { useNow, useNoSpoil } from "@/components/bets/hooks";
import { useBetGames } from "@/components/bets/use-bet-games";
import { GameBetCard } from "@/components/bets/game-bet-card";
import { TeamLogo } from "@/components/bets/team-logo";
import { SpecialPredictionsSummary } from "./special-predictions-summary";
import { MobileHome } from "@/components/mobile/mobile-home";

export interface HomeData {
  season: string;
  preseason?: { deadline: string; open: boolean; done: number; total: number };
  tonight: { date: string; games: BetGame[] };
  lastNight: { date: string; games: BetGame[] } | null;
  nextNight: { date: string; games: number; firstGameAt: string | null } | null;
  me: {
    rank: number | null; totalPlayers: number; points: number; won: number; lost: number;
    pending: number; winRate: number; specialPoints: number;
  };
  top: { rank: number; userId: string; name: string; image: string | null; points: number }[];
}

interface DashboardPageProps {
  userId: string;
  userName: string;
  userCreatedAt: string | Date;
  userImage: string | null;
}

export function DashboardPage({ userId, userName, userImage }: DashboardPageProps) {
  const now = useNow(30_000);
  const [noSpoil, setNoSpoil] = useNoSpoil();
  const tonight = useBetGames(noSpoil);
  const { setGames } = tonight;
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/home");
      if (!res.ok) throw new Error();
      const json: HomeData = await res.json();
      setData(json);
      setGames(json.tonight.games);
      setError(null);
    } catch {
      setError("Impossible de charger l'accueil.");
    }
  }, [setGames]);

  useEffect(() => { load(); }, [load]);

  // Rafraîchit les statuts toutes les 2 min (onglet visible) et au changement de nuit
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, 120_000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    if (data && getCurrentNightDate(new Date(now)) !== data.tonight.date) load();
  }, [now, data, load]);

  const games = tonight.games;
  const missing = useMemo(
    () => missingBets(games, now).sort((a, b) => a.predictionDeadline.localeCompare(b.predictionDeadline)),
    [games, now]
  );
  const bettable = games.filter((g) => isBettable(g, now));
  const predicted = games.filter((g) => g.prediction).length;

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-zinc-400">{error}</p>
        <button onClick={load} className="rounded-xl bg-[#5096ff] px-5 py-2.5 text-sm font-semibold text-white">Réessayer</button>
      </div>
    );
  }
  if (!data) return <HomeSkeleton />;

  const night = formatNight(data.tonight.date, new Date(now));
  const firstName = userName.split(" ")[0];

  return (
    <div className="min-h-screen bg-zinc-950 pb-8 md:pb-12">
      {/* ── Mobile : accueil façon jeu ── */}
      <MobileHome
        data={data}
        firstName={firstName}
        userId={userId}
        games={games}
        missing={missing}
        bettable={bettable}
        predicted={predicted}
        now={now}
        noSpoil={noSpoil}
        onToggleNoSpoil={() => setNoSpoil(!noSpoil)}
        bets={tonight}
      />

      <div className="mx-auto hidden max-w-6xl px-4 pt-6 sm:px-6 md:block lg:px-8">
        {/* ── En-tête ── */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex-shrink-0">
              {userImage ? (
                <img src={userImage} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-zinc-700" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#5096ff] to-[#ff5050] text-sm font-bold text-white">
                  {userName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Salut {firstName}</h1>
              <p className="text-xs text-zinc-500">Saison {getSeasonLabel(data.season)}</p>
            </div>
          </div>
          <button
            onClick={() => setNoSpoil(!noSpoil)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              noSpoil ? "border-[#ff5050]/30 bg-[#ff5050]/10 text-[#ff5050]" : "border-zinc-700 bg-zinc-900 text-zinc-300"
            }`}
            title="Masquer ou afficher les scores"
          >
            {noSpoil ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{noSpoil ? "No Spoil" : "Scores visibles"}</span>
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <main className="min-w-0 space-y-8">
            {/* ── Rappel paris de début de saison ── */}
            {data.preseason && data.preseason.open && data.preseason.done < data.preseason.total && (
              <Link
                href="/pronos/preseason"
                className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-4 transition-colors hover:border-amber-500/50"
              >
                <Trophy className="h-8 w-8 flex-shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">
                    Paris de début de saison · {data.preseason.done}/{data.preseason.total} faits
                  </p>
                  <p className="text-sm text-zinc-400">
                    Classement, bracket, NBA Cup, MVP — fermeture dans{" "}
                    <b className="text-amber-300">{formatCountdown(new Date(data.preseason.deadline).getTime() - now)}</b>
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-amber-400" />
              </Link>
            )}

            {/* ── Ce soir ── */}
            <TonightPanel
              nightTitle={night.relative ?? night.short}
              nightLabel={night.night}
              games={games}
              missing={missing}
              bettable={bettable}
              predicted={predicted}
              now={now}
              nextNight={data.nextNight}
              onBetMissing={() => tonight.openSheet(missing, 0)}
              onReview={() => tonight.openSheet(bettable, 0, "Mes paris de la nuit")}
            />

            {games.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-lg font-bold text-white">Les matchs</h2>
                  <Link href="/matchs" className="flex items-center gap-1 text-xs font-medium text-[#5096ff] hover:text-[#5096ff]/80">
                    Calendrier <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {games.map((g) => (
                    <GameBetCard
                      key={g.id}
                      game={g}
                      now={now}
                      noSpoil={noSpoil}
                      saving={tonight.savingId === g.id}
                      onQuickPick={tonight.quickPick}
                      onOpen={tonight.openGame}
                      onShowBoxscore={tonight.showBoxscore}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Dernière nuit ── */}
            {data.lastNight && data.lastNight.games.length > 0 && (
              <LastNight date={data.lastNight.date} games={data.lastNight.games} noSpoil={noSpoil} now={now} />
            )}
          </main>

          {/* ── Colonne latérale ── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <SeasonCard season={data.season} me={data.me} />
            <TopPlayers top={data.top} me={data.me} userId={userId} />
            <SpecialPredictionsSummary />
          </aside>
        </div>
      </div>

      {tonight.overlays}
    </div>
  );
}

// ─── Ce soir ─────────────────────────────────────────────────────────────────

function TonightPanel({ nightTitle, nightLabel, games, missing, bettable, predicted, now, nextNight, onBetMissing, onReview }: {
  nightTitle: string; nightLabel: string; games: BetGame[]; missing: BetGame[]; bettable: BetGame[];
  predicted: number; now: number; nextNight: HomeData["nextNight"];
  onBetMissing: () => void; onReview: () => void;
}) {
  const live = games.filter((g) => g.status === "LIVE").length;
  const finals = games.filter((g) => g.status === "FINAL").length;
  const nextDeadline = missing[0] ?? [...bettable].sort((a, b) => a.predictionDeadline.localeCompare(b.predictionDeadline))[0];
  const pct = games.length ? Math.round((predicted / games.length) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#5096ff]/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#5096ff]">
              <Moon className="h-3.5 w-3.5" /> {nightTitle}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl first-letter:uppercase">{nightLabel}</h2>
            <p className="text-xs text-zinc-500">Heures affichées en heure de Paris</p>
          </div>
          {games.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums text-white">
                {predicted}<span className="text-zinc-600">/{games.length}</span>
              </p>
              <p className="text-[11px] text-zinc-500">pronos faits</p>
            </div>
          )}
        </div>

        {games.length > 0 && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-[#5096ff] to-[#dcff50] transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="mt-5">
          {games.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">Pas de match cette nuit</p>
                {nextNight ? (
                  <p className="text-sm text-zinc-400">
                    Prochains matchs : <span className="text-white first-letter:uppercase">{formatNight(nextNight.date).night.replace("Nuit du ", "nuit du ")}</span>
                    {" · "}{nextNight.games} match{nextNight.games > 1 ? "s" : ""}
                    {nextNight.firstGameAt && <> · 1er à {formatParisTime(nextNight.firstGameAt)}</>}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400">Aucun match programmé pour le moment.</p>
                )}
              </div>
              <Link href="/matchs" className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                <CalendarDays className="h-4 w-4" /> Calendrier
              </Link>
            </div>
          ) : missing.length > 0 ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-[#ff5050]/25 bg-[#ff5050]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#ff5050]" />
                <div>
                  <p className="font-semibold text-white">
                    {missing.length === 1 ? "Il te manque 1 pari" : `Il te manque ${missing.length} paris`}
                  </p>
                  {nextDeadline && (
                    <p className="text-sm text-zinc-400">
                      Prochaine clôture <span className="font-semibold text-white">{formatParisTime(nextDeadline.predictionDeadline)}</span>
                      {" "}(dans {formatCountdown(new Date(nextDeadline.predictionDeadline).getTime() - now)})
                      {" · "}{nextDeadline.awayTeam.abbreviation} @ {nextDeadline.homeTeam.abbreviation}
                    </p>
                  )}
                  <div className="mt-2 flex -space-x-1">
                    {missing.slice(0, 8).map((g) => (
                      <span key={g.id} className="flex items-center rounded-full bg-zinc-900 px-1.5 py-0.5 ring-1 ring-zinc-800">
                        <TeamLogo abbreviation={g.awayTeam.abbreviation} size={14} />
                        <TeamLogo abbreviation={g.homeTeam.abbreviation} size={14} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={onBetMissing}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#ff5050] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#ff5050]/20 transition-colors hover:bg-[#ff5050]/90"
              >
                <Zap className="h-4 w-4" />
                {missing.length === 1 ? "Parier maintenant" : `Faire mes ${missing.length} paris`}
              </button>
            </div>
          ) : bettable.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                <div>
                  <p className="font-semibold text-white">Tous tes pronos sont faits</p>
                  <p className="text-sm text-zinc-400">
                    Modifiables jusqu&apos;au coup d&apos;envoi de chaque match
                    {nextDeadline && <> · prochaine clôture {formatParisTime(nextDeadline.predictionDeadline)}</>}
                  </p>
                </div>
              </div>
              <button onClick={onReview} className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                Ajouter des bonus
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-800/30 p-4">
              <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-zinc-500" />
              <div>
                <p className="font-semibold text-white">Paris fermés pour cette nuit</p>
                <p className="text-sm text-zinc-400">
                  {[live && `${live} en direct`, finals && `${finals} terminé${finals > 1 ? "s" : ""}`].filter(Boolean).join(" · ") || "Les matchs vont commencer"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Dernière nuit ───────────────────────────────────────────────────────────

function LastNight({ date, games, noSpoil, now }: { date: string; games: BetGame[]; noSpoil: boolean; now: number }) {
  const [revealed, setRevealed] = useState(false);
  const night = formatNight(date, new Date(now));
  const visible = !noSpoil || revealed;
  const withBet = games.filter((g) => g.prediction);
  const won = withBet.filter((g) => g.prediction?.result === "WON").length;
  const graded = withBet.filter((g) => g.prediction?.result === "WON" || g.prediction?.result === "LOST").length;
  const points = withBet.reduce((s, g) => s + (g.prediction?.pointsEarned ?? 0), 0);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">{night.relative ?? "Dernière nuit"}</h2>
          <p className="text-xs text-zinc-500 first-letter:uppercase">{night.night}</p>
        </div>
        {visible && graded > 0 && (
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{won}/{graded}</span> bons pronos · <span className="font-bold text-[#dcff50]">+{points} pts</span>
          </p>
        )}
      </div>

      {!visible ? (
        <button
          onClick={() => setRevealed(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 py-6 text-sm text-zinc-400 hover:border-zinc-700 hover:text-white"
        >
          <EyeOff className="h-4 w-4" /> Résultats masqués (No Spoil) · Afficher
        </button>
      ) : (
        <div className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          {games.map((g) => <ResultRow key={g.id} game={g} />)}
        </div>
      )}
    </section>
  );
}

function ResultRow({ game }: { game: BetGame }) {
  const p = game.prediction;
  const final = game.status === "FINAL" && game.homeScore !== null && game.awayScore !== null;
  const pick = p ? (p.predictedTeamId === game.homeTeam.id ? game.homeTeam : game.awayTeam) : null;
  const awayWon = final && game.awayScore! > game.homeScore!;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <TeamLogo abbreviation={game.awayTeam.abbreviation} size={22} />
        <span className={`w-9 font-semibold ${final && !awayWon ? "text-zinc-500" : "text-white"}`}>{game.awayTeam.abbreviation}</span>
        <span className="tabular-nums text-zinc-400">{final ? `${game.awayScore} – ${game.homeScore}` : game.status === "POSTPONED" ? "reporté" : "–"}</span>
        <span className={`w-9 text-right font-semibold ${final && awayWon ? "text-zinc-500" : "text-white"}`}>{game.homeTeam.abbreviation}</span>
        <TeamLogo abbreviation={game.homeTeam.abbreviation} size={22} />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {pick ? (
          <span className="hidden items-center gap-1 text-xs text-zinc-500 sm:flex">
            choix <TeamLogo abbreviation={pick.abbreviation} size={16} />
          </span>
        ) : (
          <span className="text-xs text-zinc-600">pas de prono</span>
        )}
        {p && (p.result === "WON" || p.result === "LOST") ? (
          <span className={`w-16 rounded-full py-0.5 text-center text-xs font-bold ${p.result === "WON" ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
            {p.pointsEarned > 0 ? `+${p.pointsEarned}` : "0"} pts
          </span>
        ) : p ? (
          <span className="w-16 text-center text-[11px] text-zinc-500">en attente</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Colonne latérale ────────────────────────────────────────────────────────

function SeasonCard({ season, me }: { season: string; me: HomeData["me"] }) {
  const finished = me.won + me.lost;
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Ma saison {season}</p>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-3xl font-black tabular-nums text-[#dcff50]">{me.points}</p>
          <p className="text-xs text-zinc-500">points{me.specialPoints ? ` (dont ${me.specialPoints} paris de saison)` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{me.rank ? `${me.rank}${me.rank === 1 ? "er" : "e"}` : "–"}</p>
          <p className="text-xs text-zinc-500">sur {me.totalPlayers} joueur{me.totalPlayers > 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Réussis" value={me.won} tone="text-green-400" />
        <Stat label="Ratés" value={me.lost} tone="text-zinc-300" />
        <Stat label="Réussite" value={finished ? `${Math.round(me.winRate)}%` : "–"} tone="text-[#5096ff]" />
      </div>
      <Link href="/pronos/matchs" className="mt-3 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white">
        Historique de mes pronos <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl bg-zinc-800/50 py-2">
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}

function TopPlayers({ top, me, userId }: { top: HomeData["top"]; me: HomeData["me"]; userId: string }) {
  const inTop = top.some((t) => t.userId === userId);
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Trophy className="h-4 w-4 text-[#dcff50]" /> Classement
        </h2>
        <Link href="/classement" className="text-[11px] text-zinc-500 hover:text-zinc-300">Voir tout</Link>
      </div>
      {top.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-zinc-500">Pas encore de points cette saison.</p>
      ) : (
        <ol className="p-2">
          {top.map((t) => (
            <li key={t.userId} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${t.userId === userId ? "bg-[#5096ff]/10" : ""}`}>
              <span className={`w-5 text-center text-xs font-bold ${t.rank === 1 ? "text-yellow-400" : t.rank === 2 ? "text-zinc-300" : t.rank === 3 ? "text-orange-400" : "text-zinc-500"}`}>{t.rank}</span>
              <span className="flex-1 truncate text-sm text-zinc-200">{t.name}{t.userId === userId && <span className="ml-1 text-[11px] text-[#5096ff]">(toi)</span>}</span>
              <span className="text-sm font-bold tabular-nums text-white">{t.points}</span>
            </li>
          ))}
          {!inTop && me.rank && (
            <li className="mt-1 flex items-center gap-3 rounded-lg border-t border-zinc-800 bg-[#5096ff]/10 px-2 py-1.5">
              <span className="w-5 text-center text-xs font-bold text-zinc-400">{me.rank}</span>
              <span className="flex-1 text-sm text-zinc-200">Toi</span>
              <span className="text-sm font-bold tabular-nums text-white">{me.points}</span>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 h-11 w-48 rounded-xl bg-zinc-900" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-48 rounded-3xl bg-zinc-900" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-zinc-900" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-44 rounded-2xl bg-zinc-900" />
          <div className="h-60 rounded-2xl bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}
