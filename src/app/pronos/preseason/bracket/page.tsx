"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Check, Crown, Save, Star } from "lucide-react";
import { TeamLogo } from "@/components/bets/team-logo";
import { PreseasonLayout } from "@/components/preseason/preseason-layout";
import { usePreseason, type PreseasonTeam } from "@/components/preseason/use-preseason";
import {
  resolveBracket, bracketToData, dataToBracket, emptyBracketPicks, stableStringify, SERIES_GAMES,
  type BracketPicks, type ConfPicks, type Matchup, type ResolvedConference, type SeriesGames,
} from "@/lib/preseason-bracket";
import { PRESEASON_BRACKET_POINTS as P, bracketRoundLabel, type PreseasonBracketData, type StandingsPredictionData } from "@/types/special-predictions";
import { fmtPts } from "@/lib/format";

type Conf = "east" | "west";
type Tab = Conf | "finals";

export default function PreseasonBracketPage() {
  const { data, error, open, now, saving, save } = usePreseason({ players: true });
  const [tab, setTab] = useState<Tab>("west");
  const [picks, setPicks] = useState<BracketPicks | null>(null);
  const [seedsChanged, setSeedsChanged] = useState(false);

  const standingsSaved = (data?.predictions.PRESEASON_NBA_STANDINGS?.data as StandingsPredictionData | undefined) ?? null;
  const standings = standingsSaved ?? data?.defaults.standings ?? null;
  const seedsEast = useMemo(() => standings?.east.slice(0, 10) ?? [], [standings]);
  const seedsWest = useMemo(() => standings?.west.slice(0, 10) ?? [], [standings]);
  const savedData = (data?.predictions.PRESEASON_BRACKET?.data as PreseasonBracketData | undefined) ?? null;
  const draftKey = data ? `bracket-draft-${data.season}` : null;

  // Initialisation : bracket enregistré, sinon brouillon local, sinon vide
  useEffect(() => {
    if (!data || picks) return;
    let initial = emptyBracketPicks();
    if (savedData) {
      const parsed = dataToBracket(savedData);
      initial = parsed.picks;
      setSeedsChanged(parsed.seedsEast.join() !== seedsEast.join() || parsed.seedsWest.join() !== seedsWest.join());
    } else if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) initial = JSON.parse(raw);
      } catch { /* brouillon illisible */ }
    }
    setPicks(resolveBracket(seedsEast, seedsWest, initial).picks);
  }, [data, picks, savedData, seedsEast, seedsWest, draftKey]);

  const resolved = useMemo(() => (picks ? resolveBracket(seedsEast, seedsWest, picks) : null), [picks, seedsEast, seedsWest]);

  const playerTeam = useMemo(() => new Map((data?.players ?? []).map((p) => [p.id, p.teamId])), [data]);

  const update = useCallback((fn: (p: BracketPicks) => BracketPicks) => {
    if (!open) return;
    setPicks((prev) => {
      if (!prev) return prev;
      const r = resolveBracket(seedsEast, seedsWest, fn(structuredClone(prev)));
      const next = r.picks;
      // MVP des Finales : effacé s'il ne joue plus dans une des deux équipes finalistes
      if (next.mvpFinals) {
        const team = playerTeam.get(next.mvpFinals);
        if (!team || (team !== r.finals.team1 && team !== r.finals.team2)) next.mvpFinals = null;
      }
      if (draftKey) { try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* ignore */ } }
      return next;
    });
  }, [open, seedsEast, seedsWest, draftKey, playerTeam]);

  const teamById = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data]);
  const canonical = resolved ? bracketToData(resolved) : null;
  const dirty = !!canonical && stableStringify(canonical) !== stableStringify(savedData);

  const handleSave = async () => {
    if (!canonical) return;
    const ok = await save("PRESEASON_BRACKET", canonical, "Bracket enregistré");
    if (ok) { setSeedsChanged(false); if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } } }
  };

  const champion = resolved?.champion ? teamById.get(resolved.champion) : null;

  return (
    <PreseasonLayout
      title="Bracket Play-in + Playoffs"
      subtitle="Du Play-in jusqu'au titre, à partir de ton classement. Chaque tour rapporte le double du précédent."
      season={data?.season}
      deadline={data?.deadline}
      open={open}
      now={now}
      saved={!!savedData}
      prediction={data?.predictions.PRESEASON_BRACKET}
      loading={!data && !error}
      error={error}
    >
      {data && resolved && (
        <div className="space-y-4 pb-24">
          {!standingsSaved && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <p className="text-zinc-300">
                Seeds basées sur le classement {data.previousSeason}.{" "}
                <Link href="/pronos/preseason/classement" className="font-semibold text-[#5096ff] hover:underline">Fais ton classement</Link> pour les personnaliser.
              </p>
            </div>
          )}
          {seedsChanged && (
            <div className="flex items-start gap-3 rounded-xl border border-[#5096ff]/30 bg-[#5096ff]/5 px-4 py-3 text-sm text-zinc-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5096ff]" />
              Ton classement a changé depuis ton dernier bracket : les seeds sont mises à jour, vérifie tes choix puis réenregistre.
            </div>
          )}

          {/* Progression + champion */}
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            {champion ? <TeamLogo abbreviation={champion.abbreviation} size={44} /> : <Crown className="h-10 w-10 text-zinc-700" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Ton champion</p>
              <p className="truncate font-bold">{champion ? `${champion.city} ${champion.name}` : "À désigner"}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-gradient-to-r from-[#5096ff] to-[#dcff50]" style={{ width: `${(resolved.progress.done / resolved.progress.total) * 100}%` }} />
              </div>
            </div>
            <p className="text-sm font-bold tabular-nums text-zinc-300">{resolved.progress.done}/{resolved.progress.total}</p>
          </div>

          {/* Onglets */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-900 p-1 ring-1 ring-zinc-800">
            {([["west", "Ouest"], ["east", "Est"], ["finals", "Finale"]] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-medium ${tab === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>

          {tab !== "finals" ? (
            <ConferenceView
              conf={tab}
              resolved={tab === "east" ? resolved.east : resolved.west}
              teamById={teamById}
              open={open}
              onSeed={(which, teamId) => update((p) => {
                const c = p[tab];
                const other = which === "seed7" ? "seed8" : "seed7";
                if (c[other] === teamId) c[other] = c[which];
                c[which] = teamId;
                return p;
              })}
              onPick={(round, i, winnerId) => update((p) => {
                setPick(p[tab], round, i, (prev) => ({ winnerId, games: prev?.games ?? null }));
                return p;
              })}
              onGames={(round, i, games) => update((p) => {
                setPick(p[tab], round, i, (prev) => (prev ? { ...prev, games } : prev));
                return p;
              })}
            />
          ) : (
            <FinalsView
              resolved={resolved}
              teamById={teamById}
              players={data.players ?? []}
              open={open}
              onPick={(winnerId) => update((p) => { p.finals = { winnerId, games: p.finals?.games ?? null }; return p; })}
              onGames={(games) => update((p) => { if (p.finals) p.finals.games = games; return p; })}
              onMvp={(playerId) => update((p) => { p.mvpFinals = playerId; return p; })}
            />
          )}

          {/* Barre d'enregistrement */}
          {open && (
            <div
              className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 px-4 pt-3 backdrop-blur"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  {!resolved.complete
                    ? `Encore ${resolved.progress.total - resolved.progress.done} choix (brouillon gardé sur cet appareil)`
                    : dirty ? "Bracket complet, pas encore enregistré" : "Bracket enregistré"}
                </span>
                <button onClick={handleSave} disabled={saving || !resolved.complete || !dirty}
                  className="flex items-center gap-2 rounded-xl bg-[#5096ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5096ff]/90 disabled:opacity-40">
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PreseasonLayout>
  );
}

function setPick(c: ConfPicks, round: "r1" | "r2" | "cf", i: number, fn: (prev: ConfPicks["cf"]) => ConfPicks["cf"]): void {
  if (round === "cf") c.cf = fn(c.cf);
  else c[round][i] = fn(c[round][i]);
}

// ─── Conférence ──────────────────────────────────────────────────────────────

const R1_LABELS = ["1 vs 8", "4 vs 5", "3 vs 6", "2 vs 7"];

function ConferenceView({ conf, resolved, teamById, open, onSeed, onPick, onGames }: {
  conf: Conf;
  resolved: ResolvedConference;
  teamById: Map<string, PreseasonTeam>;
  open: boolean;
  onSeed: (which: "seed7" | "seed8", teamId: string) => void;
  onPick: (round: "r1" | "r2" | "cf", i: number, winnerId: string) => void;
  onGames: (round: "r1" | "r2" | "cf", i: number, games: SeriesGames) => void;
}) {
  const seedOf = (id: string | null) => {
    if (!id) return null;
    if (id === resolved.seed7) return 7;
    if (id === resolved.seed8) return 8;
    const i = resolved.seeds.indexOf(id);
    return i >= 0 && i < 6 ? i + 1 : null;
  };

  return (
    <div className="space-y-5">
      {/* Play-in */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Play-in · Conférence {conf === "east" ? "Est" : "Ouest"}</h3>
          <span className="text-[11px] font-semibold text-[#dcff50]">{P.PLAYIN_TEAM} pts par équipe qualifiée</span>
        </div>
        <p className="mb-3 text-xs text-zinc-500">Parmi tes 7e à 10e, qui décroche les places 7 et 8 ?</p>
        {(["seed7", "seed8"] as const).map((which) => (
          <div key={which} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-xs font-medium text-zinc-400">{which === "seed7" ? "7e place" : "8e place"}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {resolved.playinTeams.map((id) => {
                const t = teamById.get(id);
                if (!t) return null;
                const selected = resolved[which] === id;
                const takenByOther = resolved[which === "seed7" ? "seed8" : "seed7"] === id;
                return (
                  <button key={id} disabled={!open} onClick={() => onSeed(which, id)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                      selected ? "border-[#5096ff] bg-[#5096ff]/10" : takenByOther ? "border-zinc-800 opacity-40" : "border-zinc-800 hover:border-zinc-600"
                    }`}>
                    <span className="w-4 text-[11px] text-zinc-500">{resolved.seeds.indexOf(id) + 1}</span>
                    <TeamLogo abbreviation={t.abbreviation} size={22} />
                    <span className="font-semibold">{t.abbreviation}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <RoundSection title="1er tour" hint={bracketRoundLabel(P.R1)}>
        {resolved.r1.map((m, i) => (
          <SeriesCard key={i} label={R1_LABELS[i]} matchup={m} seedOf={seedOf} teamById={teamById} open={open}
            onPick={(w) => onPick("r1", i, w)} onGames={(g) => onGames("r1", i, g)} />
        ))}
      </RoundSection>

      <RoundSection title="Demi-finales de conférence" hint={bracketRoundLabel(P.R2)}>
        {resolved.r2.map((m, i) => (
          <SeriesCard key={i} label={i === 0 ? "Haut de tableau" : "Bas de tableau"} matchup={m} seedOf={seedOf} teamById={teamById} open={open}
            onPick={(w) => onPick("r2", i, w)} onGames={(g) => onGames("r2", i, g)} />
        ))}
      </RoundSection>

      <RoundSection title="Finale de conférence" hint={bracketRoundLabel(P.CF)}>
        <SeriesCard label={`Finale ${conf === "east" ? "Est" : "Ouest"}`} matchup={resolved.cf} seedOf={seedOf} teamById={teamById} open={open}
          onPick={(w) => onPick("cf", 0, w)} onGames={(g) => onGames("cf", 0, g)} />
      </RoundSection>
    </div>
  );
}

function RoundSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[11px] font-semibold text-[#dcff50]">{hint}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SeriesCard({ label, matchup, seedOf, teamById, open, onPick, onGames }: {
  label: string;
  matchup: Matchup;
  seedOf: (id: string | null) => number | null;
  teamById: Map<string, PreseasonTeam>;
  open: boolean;
  onPick: (winnerId: string) => void;
  onGames: (games: SeriesGames) => void;
}) {
  const ready = !!matchup.team1 && !!matchup.team2;
  return (
    <div className={`rounded-2xl border bg-zinc-900/60 p-3 ${ready && !matchup.pick?.games ? "border-[#ff5050]/30" : "border-zinc-800"}`}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      {!ready ? (
        <p className="py-4 text-center text-xs text-zinc-600">En attente du tour précédent</p>
      ) : (
        <>
          <div className="space-y-1">
            {[matchup.team1!, matchup.team2!].map((id) => {
              const t = teamById.get(id);
              const selected = matchup.pick?.winnerId === id;
              return (
                <button key={id} disabled={!open} onClick={() => onPick(id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors disabled:cursor-default ${
                    selected ? "bg-[#5096ff]/15 ring-1 ring-[#5096ff]/60" : "hover:bg-zinc-800/70"
                  }`}>
                  <span className="w-4 text-center text-[11px] text-zinc-500">{seedOf(id) ?? ""}</span>
                  {t && <TeamLogo abbreviation={t.abbreviation} size={26} />}
                  <span className={`flex-1 truncate text-sm font-semibold ${matchup.pick && !selected ? "text-zinc-500" : "text-white"}`}>{t?.name ?? "?"}</span>
                  {selected && <Check className="h-4 w-4 text-[#5096ff]" />}
                </button>
              );
            })}
          </div>
          {matchup.pick && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="mr-1 text-[11px] text-zinc-500">en</span>
              {SERIES_GAMES.map((g) => (
                <button key={g} disabled={!open} onClick={() => onGames(g)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors disabled:cursor-default ${
                    matchup.pick?.games === g ? "bg-[#5096ff] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}>
                  {g}
                </button>
              ))}
              <span className="ml-1 text-[11px] text-zinc-500">matchs</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Finale ──────────────────────────────────────────────────────────────────

function FinalsView({ resolved, teamById, players, open, onPick, onGames, onMvp }: {
  resolved: ReturnType<typeof resolveBracket>;
  teamById: Map<string, PreseasonTeam>;
  players: { id: string; fullName: string; headshot: string | null; teamId: string | null; previousPpg: number | null; ppg: number | null }[];
  open: boolean;
  onPick: (winnerId: string) => void;
  onGames: (games: SeriesGames) => void;
  onMvp: (playerId: string) => void;
}) {
  const { finals } = resolved;
  const finalistIds = [finals.team1, finals.team2].filter(Boolean) as string[];
  const candidates = players
    .filter((p) => p.teamId && finalistIds.includes(p.teamId))
    .sort((a, b) => (b.previousPpg ?? b.ppg ?? 0) - (a.previousPpg ?? a.ppg ?? 0));

  return (
    <div className="space-y-5">
      <RoundSection title="Finale NBA" hint={bracketRoundLabel(P.CHAMPION)}>
        <SeriesCard label="Est vs Ouest" matchup={finals} seedOf={() => null} teamById={teamById} open={open} onPick={onPick} onGames={onGames} />
      </RoundSection>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">MVP des Finales</h3>
          <span className="text-[11px] font-semibold text-[#dcff50]">{fmtPts(P.FINALS_MVP)} pts</span>
        </div>
        {finalistIds.length < 2 ? (
          <p className="rounded-2xl border border-zinc-800 py-6 text-center text-xs text-zinc-600">Désigne d&apos;abord les deux finalistes</p>
        ) : (
          <div className="max-h-96 divide-y divide-zinc-800/80 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
            {candidates.map((p) => {
              const selected = resolved.mvpFinals === p.id;
              const team = p.teamId ? teamById.get(p.teamId) : null;
              return (
                <button key={p.id} disabled={!open} onClick={() => onMvp(p.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-default ${selected ? "bg-[#5096ff]/15" : "hover:bg-zinc-800/60"}`}>
                  {p.headshot ? <Image src={p.headshot} alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-zinc-800 object-cover" /> : <span className="h-8 w-8 rounded-full bg-zinc-800" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.fullName}</span>
                    <span className="block text-[11px] text-zinc-500">{p.previousPpg != null ? `${p.previousPpg.toFixed(1)} pts/m la saison passée` : "Nouveau"}</span>
                  </span>
                  {team && <TeamLogo abbreviation={team.abbreviation} size={20} />}
                  {selected ? <Star className="h-4 w-4 text-[#5096ff]" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
