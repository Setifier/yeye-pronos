"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { X, Check, ChevronRight, ChevronLeft, Loader2, Clock, Lock, Target, Star, Zap, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import type { BetGame, BetPrediction, BetTeam } from "@/types/bet";
import { isBettable, MARGIN_OPTIONS } from "@/types/bet";
import { formatParisDayTime, formatParisTime } from "@/lib/game-night";
import { savePrediction, useNow } from "./hooks";
import { TeamLogo } from "./team-logo";
import { GameTags, DeadlineChip } from "./game-bet-card";

interface SheetPlayer {
  id:            string;
  fullName:      string;
  headshot:      string | null;
  position:      string | null;
  jerseyNumber:  string | null;
  pointsPerGame: number;
  gamesPlayed:   number;
  ppgSource:     "current" | "blended" | "previous" | "none";
  odds:          number;
  isInjured:     boolean;
  injuryStatus:  string | null;
}

interface BetSheetProps {
  /** File de matchs à parier (1 seul = édition d'un match). */
  games: BetGame[];
  startIndex?: number;
  title?: string;
  onClose: () => void;
  onPredictionChange: (gameId: string, prediction: BetPrediction) => void;
}

const EMPTY_PREDICTION: Omit<BetPrediction, "predictedTeamId"> = {
  predictedScoreMargin: null,
  predictedTopScorer: null,
  result: "PENDING",
  pointsEarned: 0,
  marginBonusPoints: 0,
  topScorerBonusPoints: 0,
  comboBonusPoints: 0,
};

const PLAYERS_PREVIEW = 6;

export function BetSheet({ games, startIndex = 0, title, onClose, onPredictionChange }: BetSheetProps) {
  const now = useNow(15_000);
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, games.length - 1)));
  const [done, setDone] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, BetPrediction | null>>(
    () => Object.fromEntries(games.map((g) => [g.id, g.prediction]))
  );
  const [players, setPlayers] = useState<Record<string, { home: SheetPlayer[]; away: SheetPlayer[] }>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState<null | "team" | "margin" | "scorer">(null);
  const [scorerTab, setScorerTab] = useState<"away" | "home">("away");
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const game = games[index];
  const prediction = game ? predictions[game.id] ?? null : null;
  const open = game ? isBettable(game, now) : false;
  const multi = games.length > 1;

  // Bloquer le scroll de la page + fermer avec Échap
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Effectifs + cotes, dès qu'une équipe est choisie (section bonus visible) — une requête par match
  const gameId = game?.id;
  const hasPrediction = !!prediction;
  const requested = useRef(new Set<string>());
  useEffect(() => {
    if (!gameId || !hasPrediction || requested.current.has(gameId)) return;
    requested.current.add(gameId);
    setLoadingPlayers(true);
    fetch(`/api/games/${gameId}/players`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.players) return;
        setPlayers((p) => ({ ...p, [gameId]: { home: data.players.home ?? [], away: data.players.away ?? [] } }));
      })
      .catch(() => { requested.current.delete(gameId); })
      .finally(() => setLoadingPlayers(false));
  }, [gameId, hasPrediction]);

  const apply = (gameId: string, p: BetPrediction) => {
    setPredictions((prev) => ({ ...prev, [gameId]: p }));
    onPredictionChange(gameId, p);
  };

  async function run(kind: "team" | "margin" | "scorer", optimistic: BetPrediction, request: () => Promise<BetPrediction>) {
    if (!game) return;
    const before = predictions[game.id] ?? null;
    setPredictions((prev) => ({ ...prev, [game.id]: optimistic }));
    setSaving(kind);
    try {
      apply(game.id, await request());
    } catch (err) {
      setPredictions((prev) => ({ ...prev, [game.id]: before }));
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSaving(null);
    }
  }

  const pickTeam = (teamId: string) => {
    if (!game || !open || saving || prediction?.predictedTeamId === teamId) return;
    run("team", { ...(prediction ?? EMPTY_PREDICTION), predictedTeamId: teamId }, () =>
      savePrediction({ gameId: game.id, predictedTeamId: teamId })
    );
  };

  const pickMargin = (key: string) => {
    if (!game || !open || saving || !prediction) return;
    const value = prediction.predictedScoreMargin === key ? null : key;
    run("margin", { ...prediction, predictedScoreMargin: value }, () =>
      savePrediction({ gameId: game.id, predictedTeamId: prediction.predictedTeamId, predictedScoreMargin: value })
    );
  };

  const pickScorer = (player: SheetPlayer | null) => {
    if (!game || !open || saving || !prediction) return;
    const same = player && prediction.predictedTopScorer?.id === player.id;
    const next = same ? null : player;
    run("scorer", {
      ...prediction,
      predictedTopScorer: next ? { id: next.id, fullName: next.fullName, headshot: next.headshot } : null,
    }, () =>
      savePrediction({ gameId: game.id, predictedTeamId: prediction.predictedTeamId, predictedTopScorerId: next?.id ?? null })
    );
  };

  const goTo = (i: number) => {
    setIndex(i);
    setShowAllPlayers(false);
    setScorerTab("away");
  };
  const next = () => (index < games.length - 1 ? goTo(index + 1) : multi ? setDone(true) : onClose());

  const roster = game ? players[game.id] : undefined;
  const tabPlayers = useMemo(() => {
    const list = roster ? (scorerTab === "home" ? roster.home : roster.away) : [];
    return [...list].sort((a, b) => b.pointsPerGame - a.pointsPerGame);
  }, [roster, scorerTab]);

  const madeCount = games.filter((g) => predictions[g.id]).length;

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        {/* ── En-tête ── */}
        <div className="px-5 pt-3 pb-3 border-b border-zinc-800/80">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {done ? "Récapitulatif" : multi ? `Pari ${index + 1} sur ${games.length}` : title ?? "Ton prono"}
              </p>
              {!done && (
                <p className="text-sm text-zinc-300 truncate">
                  {game.awayTeam.city} {game.awayTeam.name} <span className="text-zinc-600">@</span> {game.homeTeam.city} {game.homeTeam.name}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
          {multi && (
            <div className="mt-3 flex gap-1">
              {games.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => { setDone(false); goTo(i); }}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    predictions[g.id] ? "bg-[#5096ff]" : i === index && !done ? "bg-zinc-500" : "bg-zinc-800"
                  }`}
                  aria-label={`Match ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {done ? (
          <DoneScreen games={games} predictions={predictions} onClose={onClose} onEdit={(i) => { setDone(false); goTo(i); }} />
        ) : (
          <>
            {/* ── Corps ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Horaire + clôture */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <span className="font-semibold text-white capitalize">{formatParisDayTime(game.gameDate)}</span>
                  <span className="text-zinc-500">heure de Paris</span>
                </div>
                <DeadlineChip game={game} now={now} />
              </div>
              <GameTags game={game} />

              {!open && (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-sm text-zinc-400">
                  <Lock className="h-4 w-4" />
                  Paris fermés pour ce match depuis {formatParisTime(game.predictionDeadline)}.
                </div>
              )}

              {/* 1. Vainqueur */}
              <section>
                <StepTitle n={1} title="Qui gagne ?" hint="+10 pts" />
                <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                  <TeamTile team={game.awayTeam} side="Extérieur" selected={prediction?.predictedTeamId === game.awayTeam.id}
                    disabled={!open || !!saving} loading={saving === "team" && prediction?.predictedTeamId === game.awayTeam.id}
                    onClick={() => pickTeam(game.awayTeam.id)} />
                  <div className="flex items-center text-sm font-bold text-zinc-600">@</div>
                  <TeamTile team={game.homeTeam} side="Domicile" selected={prediction?.predictedTeamId === game.homeTeam.id}
                    disabled={!open || !!saving} loading={saving === "team" && prediction?.predictedTeamId === game.homeTeam.id}
                    onClick={() => pickTeam(game.homeTeam.id)} />
                </div>
                {!prediction && open && (
                  <p className="mt-3 text-center text-xs text-zinc-500">Touche une équipe : ton prono est enregistré tout de suite.</p>
                )}
              </section>

              {/* 2-3. Bonus */}
              {prediction && (
                <>
                  <section>
                    <StepTitle n={2} title="Écart final" hint="+10 pts" optional />
                    <p className="-mt-1 mb-3 text-xs text-zinc-500">Compte seulement si ton équipe gagne.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {MARGIN_OPTIONS.map((m) => {
                        const active = prediction.predictedScoreMargin === m.key;
                        return (
                          <button
                            key={m.key}
                            onClick={() => pickMargin(m.key)}
                            disabled={!open || !!saving}
                            className={`rounded-xl px-2 py-2.5 text-center transition-all disabled:cursor-not-allowed ${
                              active
                                ? "bg-[#5096ff] text-white shadow-lg shadow-[#5096ff]/20"
                                : "bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                            }`}
                          >
                            <span className="block text-sm font-bold">{m.short}</span>
                            <span className={`block text-[10px] ${active ? "text-white/80" : "text-zinc-500"}`}>{m.key === "OVERTIME" ? "Prolong." : m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <StepTitle n={3} title="Meilleur marqueur" hint="40 − sa moyenne" optional />
                    <p className="-mt-1 mb-3 text-xs text-zinc-500">Plus le joueur est inattendu, plus il rapporte. Compte même si ton équipe perd.</p>

                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-zinc-800/60 p-1">
                      {(["away", "home"] as const).map((side) => {
                        const team = side === "away" ? game.awayTeam : game.homeTeam;
                        return (
                          <button
                            key={side}
                            onClick={() => { setScorerTab(side); setShowAllPlayers(false); }}
                            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                              scorerTab === side ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <TeamLogo abbreviation={team.abbreviation} size={18} />
                            {team.abbreviation}
                          </button>
                        );
                      })}
                    </div>

                    {prediction.predictedTopScorer && (
                      <div className="mb-2 flex items-center justify-between rounded-xl border border-[#5096ff]/40 bg-[#5096ff]/10 px-3 py-2">
                        <span className="flex items-center gap-2 text-sm text-white">
                          <Star className="h-4 w-4 text-[#5096ff]" />
                          {prediction.predictedTopScorer.fullName}
                        </span>
                        <button onClick={() => pickScorer(null)} disabled={!open || !!saving} className="text-xs text-zinc-400 hover:text-red-400 disabled:opacity-50">
                          Retirer
                        </button>
                      </div>
                    )}

                    {loadingPlayers && !roster ? (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
                    ) : tabPlayers.length === 0 ? (
                      <p className="py-4 text-center text-sm text-zinc-500">Effectif indisponible</p>
                    ) : (
                      <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 overflow-hidden">
                        {(showAllPlayers ? tabPlayers : tabPlayers.slice(0, PLAYERS_PREVIEW)).map((pl) => (
                          <PlayerRow key={pl.id} player={pl} selected={prediction.predictedTopScorer?.id === pl.id}
                            disabled={!open || !!saving} onClick={() => pickScorer(pl)} />
                        ))}
                        {tabPlayers.length > PLAYERS_PREVIEW && (
                          <button onClick={() => setShowAllPlayers((v) => !v)} className="w-full py-2.5 text-xs font-medium text-[#5096ff] hover:bg-zinc-800/50">
                            {showAllPlayers ? "Réduire" : `Voir tout l'effectif (${tabPlayers.length})`}
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  <div className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                    <Zap className="h-4 w-4 flex-shrink-0 text-purple-400" />
                    <p className="text-xs text-zinc-400">
                      <span className="font-semibold text-purple-300">Combo +20 pts</span> si l&apos;équipe, l&apos;écart et le meilleur marqueur sont tous justes.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Pied ── */}
            <div
              className="flex items-center justify-between gap-3 border-t border-zinc-800/80 px-5 pt-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {multi && index > 0 ? (
                <button onClick={() => goTo(index - 1)} className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </button>
              ) : (
                <span className="text-xs text-zinc-500">
                  {saving ? "Enregistrement…" : prediction ? "✓ Enregistré" : multi ? `${madeCount}/${games.length} faits` : ""}
                </span>
              )}
              <button
                onClick={next}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                  prediction || !open
                    ? "bg-[#5096ff] text-white hover:bg-[#5096ff]/90"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {!multi ? "Terminé" : index < games.length - 1 ? (prediction || !open ? "Match suivant" : "Passer") : "Terminer"}
                {multi && index < games.length - 1 && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function StepTitle({ n, title, hint, optional }: { n: number; title: string; hint: string; optional?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] text-zinc-400">{n}</span>
        {title}
        {optional && <span className="text-[11px] font-normal text-zinc-500">facultatif</span>}
      </h3>
      <span className="text-xs font-semibold text-[#dcff50]">{hint}</span>
    </div>
  );
}

function TeamTile({ team, side, selected, disabled, loading, onClick }: {
  team: BetTeam; side: string; selected: boolean; disabled: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 transition-all ${
        selected
          ? "border-[#5096ff] bg-[#5096ff]/10"
          : "border-zinc-800 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/70 disabled:hover:border-zinc-800 disabled:opacity-60"
      } ${disabled ? "cursor-default" : "cursor-pointer"}`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#5096ff]">
          {loading ? <Loader2 className="h-3 w-3 animate-spin text-white" /> : <Check className="h-3 w-3 text-white" />}
        </span>
      )}
      <TeamLogo abbreviation={team.abbreviation} size={56} />
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{team.city}</span>
      <span className="text-base font-bold leading-tight text-white">{team.name}</span>
      <span className="text-xs text-zinc-400">{team.record ? `${team.record} · ` : ""}{side}</span>
    </button>
  );
}

function PlayerRow({ player, selected, disabled, onClick }: {
  player: SheetPlayer; selected: boolean; disabled: boolean; onClick: () => void;
}) {
  const out = player.isInjured && /out/i.test(player.injuryStatus ?? "");
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${
        selected ? "bg-[#5096ff]/15" : "hover:bg-zinc-800/60"
      } ${out ? "opacity-60" : ""}`}
    >
      {player.headshot ? (
        <Image src={player.headshot} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-zinc-800 object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">{player.jerseyNumber ?? "?"}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">{player.fullName}</span>
        <span className="block text-[11px] text-zinc-500">
          {player.pointsPerGame > 0 ? `${player.pointsPerGame.toFixed(1)} pts/match` : "Pas encore de stats"}
          {player.ppgSource === "previous" && " · saison passée"}
          {player.ppgSource === "blended" && " · début de saison"}
        </span>
      </span>
      {player.isInjured && (
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${out ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
          {out ? "Absent" : "Incertain"}
        </span>
      )}
      <span className="w-12 text-right text-sm font-bold text-[#dcff50]">+{player.odds}</span>
      {selected && <Check className="h-4 w-4 text-[#5096ff]" />}
    </button>
  );
}

function DoneScreen({ games, predictions, onClose, onEdit }: {
  games: BetGame[]; predictions: Record<string, BetPrediction | null>; onClose: () => void; onEdit: (i: number) => void;
}) {
  const made = games.filter((g) => predictions[g.id]).length;
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#5096ff]/15">
          <PartyPopper className="h-7 w-7 text-[#5096ff]" />
        </span>
        <h3 className="text-lg font-bold text-white">{made === games.length ? "Tous tes paris sont faits !" : `${made} pari${made > 1 ? "s" : ""} sur ${games.length}`}</h3>
        <p className="text-sm text-zinc-400">Modifiables jusqu&apos;au coup d&apos;envoi de chaque match.</p>
      </div>
      <div className="space-y-2">
        {games.map((g, i) => {
          const p = predictions[g.id];
          const pick = p ? (p.predictedTeamId === g.homeTeam.id ? g.homeTeam : g.awayTeam) : null;
          return (
            <button key={g.id} onClick={() => onEdit(i)} className="flex w-full items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5 hover:bg-zinc-800">
              <span className="text-sm text-zinc-300">{g.awayTeam.abbreviation} @ {g.homeTeam.abbreviation}</span>
              {pick ? (
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <TeamLogo abbreviation={pick.abbreviation} size={20} /> {pick.abbreviation}
                  {p?.predictedScoreMargin && <Target className="h-3.5 w-3.5 text-[#5096ff]" />}
                  {p?.predictedTopScorer && <Star className="h-3.5 w-3.5 text-[#5096ff]" />}
                </span>
              ) : (
                <span className="text-xs text-zinc-500">Pas de prono</span>
              )}
            </button>
          );
        })}
      </div>
      <button onClick={onClose} className="mt-6 w-full rounded-xl bg-[#5096ff] py-3 text-sm font-semibold text-white hover:bg-[#5096ff]/90">
        Fermer
      </button>
    </div>
  );
}
