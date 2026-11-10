"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, EyeOff, Loader2, Star, Target, Zap } from "lucide-react";
import { TeamLogo } from "@/components/bets/team-logo";
import { useNoSpoil } from "@/components/bets/hooks";
import { Avatar, fmtNumber, ordinal } from "@/components/mobile/ui";
import { formatNight, getCurrentNightDate, shiftNightDate } from "@/lib/game-night";
import type { ComparedBet, ComparedGame, PlayerNight } from "@/lib/player-bets";
import { marginLabel } from "@/types/bet";
import { getSeasonLabel } from "@/types/season";

interface Person {
  id: string;
  name: string;
  image: string | null;
  rank: number | null;
  points: number;
}

interface BetsResponse {
  season: string;
  isMe: boolean;
  player: Person;
  me: Person | null;
  totalPlayers: number;
  nights: PlayerNight[];
  night: string | null;
  games: ComparedGame[];
}

const firstName = (name: string) => name.split(" ")[0];

/**
 * Pronos terminés d'un joueur, nuit par nuit, à côté des miens : équipe, écart, meilleur marqueur, combo, points.
 * Jamais un match pas encore joué. No Spoil : la nuit d'hier et celle de ce soir restent masquées jusqu'au clic.
 */
export default function JoueurPronosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [noSpoil] = useNoSpoil();
  const [requested, setRequested] = useState<string | null>(null);
  const [data, setData] = useState<BetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/${id}/bets${requested ? `?night=${requested}` : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Impossible de charger les pronos");
        return r.json();
      })
      .then((d: BetsResponse) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, requested]);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        {error ? <p className="text-center text-zinc-400">{error}</p> : <Loader2 className="h-8 w-8 animate-spin text-[#5096ff]" />}
      </div>
    );
  }

  const { player, me, isMe } = data;
  const current = getCurrentNightDate();
  const isRecent = (date: string) => date >= shiftNightDate(current, -1);
  const hidden = (date: string) => noSpoil && isRecent(date) && !revealed.has(date);
  const selected = data.nights.find((n) => n.date === data.night) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:py-8">
      <Link
        href={isMe ? "/profile" : `/joueur/${player.id}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {isMe ? "Mon profil" : `Fiche de ${firstName(player.name)}`}
      </Link>

      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Avatar name={player.name} image={player.image} size={52} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-white">
            {isMe ? "Mes pronos terminés" : `Pronos de ${firstName(player.name)}`}
          </h1>
          <p className="text-sm text-zinc-400">
            {player.rank ? <><b className="text-white">{ordinal(player.rank)}</b> · </> : null}
            <b className="text-[#dcff50]">{fmtNumber(player.points)} pts</b> · saison {getSeasonLabel(data.season)}
          </p>
        </div>
      </div>

      {data.nights.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-12 text-center text-sm text-zinc-400">
          {isMe ? "Aucun prono terminé" : `${firstName(player.name)} n'a pas encore de prono terminé`} cette saison.
          <p className="mt-1 text-xs text-zinc-500">Seuls les matchs déjà joués apparaissent ici.</p>
        </div>
      ) : (
        <>
          <NightChips nights={data.nights} selected={data.night} hidden={hidden} onSelect={setRequested} isMe={isMe} />

          {selected && (
            hidden(selected.date) ? (
              <SpoilGate onReveal={() => setRevealed((s) => new Set(s).add(selected.date))} />
            ) : (
              <div className={`space-y-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
                {!isMe && me && <NightScore night={selected} player={player} me={me} />}
                <div className="grid gap-3 md:grid-cols-2">
                  {data.games.map((g) => (
                    <GameCompare key={g.id} game={g} player={player} me={isMe ? null : me} />
                  ))}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// ─── Nuits ───────────────────────────────────────────────────────────────────

function NightChips({ nights, selected, hidden, onSelect, isMe }: {
  nights: PlayerNight[];
  selected: string | null;
  hidden: (date: string) => boolean;
  onSelect: (date: string) => void;
  isMe: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div ref={ref} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {nights.map((n) => {
        const label = formatNight(n.date);
        const active = n.date === selected;
        const masked = hidden(n.date);
        const iWon = n.myPoints !== null && n.myPoints > n.points;
        const iLost = n.myPoints !== null && n.myPoints < n.points;
        return (
          <button
            key={n.date}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(n.date)}
            className={`flex-shrink-0 rounded-2xl px-3 py-2 text-left transition-colors ${
              active ? "bg-[#5096ff] text-white" : "border border-zinc-800 bg-zinc-900 text-zinc-300 active:bg-zinc-800"
            }`}
          >
            <span className="block whitespace-nowrap text-[11px] font-semibold capitalize opacity-80">{label.relative ?? label.short}</span>
            <span className="block whitespace-nowrap text-sm font-black tabular-nums">
              {masked ? "•••" : `+${n.points}`}
              {!isMe && !masked && n.myPoints !== null && (
                <span className={`ml-1 text-[10px] font-bold ${active ? "text-white/80" : iWon ? "text-emerald-400" : iLost ? "text-[#ff5050]" : "text-zinc-500"}`}>
                  · toi +{n.myPoints}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SpoilGate({ onReveal }: { onReveal: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-10 text-center">
      <EyeOff className="h-8 w-8 text-zinc-500" />
      <p className="text-sm text-zinc-300">No Spoil : les résultats de cette nuit sont masqués.</p>
      <button type="button" onClick={onReveal} className="rounded-xl bg-[#5096ff] px-4 py-2 text-sm font-bold text-white active:scale-95">
        Afficher les résultats
      </button>
    </div>
  );
}

function NightScore({ night, player, me }: { night: PlayerNight; player: Person; me: Person }) {
  const them = night.points;
  const mine = night.myPoints;
  const verdict =
    mine === null ? "Tu n'avais pas de prono cette nuit-là" :
    mine > them ? `Tu gagnes la nuit (+${mine - them})` :
    mine < them ? `${firstName(player.name)} gagne la nuit (+${them - mine})` :
    "Égalité parfaite";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Side person={player} label={firstName(player.name)} points={them} lead={mine !== null && them > mine} />
        <span className="text-sm font-black text-zinc-600">VS</span>
        <Side person={me} label="Toi" points={mine} lead={mine !== null && mine > them} alignRight />
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-zinc-400">
        {night.won}/{night.bets} bons pronos pour {firstName(player.name)} · {verdict}
      </p>
    </div>
  );
}

function Side({ person, label, points, lead, alignRight = false }: {
  person: Person; label: string; points: number | null; lead: boolean; alignRight?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${alignRight ? "flex-row-reverse text-right" : ""}`}>
      <span className="relative">
        <Avatar name={person.name} image={person.image} size={40} />
        {lead && <Crown className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 fill-yellow-400 text-yellow-400" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        <p className={`text-xl font-black tabular-nums ${lead ? "text-[#dcff50]" : "text-zinc-300"}`}>
          {points === null ? "–" : `+${points}`}
        </p>
      </div>
    </div>
  );
}

// ─── Un match : ses paris et les miens ───────────────────────────────────────

function GameCompare({ game, player, me }: { game: ComparedGame; player: Person; me: Person | null }) {
  const awayWon = game.awayScore !== null && game.homeScore !== null && game.awayScore > game.homeScore;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
      <div className="flex items-center gap-2">
        <TeamLogo abbreviation={game.awayTeam.abbreviation} size={28} />
        <span className={`text-sm font-black ${awayWon ? "text-white" : "text-zinc-500"}`}>{game.awayTeam.abbreviation}</span>
        <span className="flex-1 text-center text-base font-black tabular-nums text-white">
          {game.awayScore} – {game.homeScore}
        </span>
        <span className={`text-sm font-black ${!awayWon ? "text-white" : "text-zinc-500"}`}>{game.homeTeam.abbreviation}</span>
        <TeamLogo abbreviation={game.homeTeam.abbreviation} size={28} />
      </div>
      <p className="mt-1 text-center text-[11px] text-zinc-500">
        Écart : <span className="text-zinc-300">{marginLabel(game.margin) ?? "–"}</span>
        {game.topScorer && (
          <> · Marqueur : <span className="text-zinc-300">{game.topScorer.fullName}{game.topScorer.points ? ` (${game.topScorer.points})` : ""}</span></>
        )}
      </p>
      <div className="mt-2.5 space-y-2 border-t border-zinc-800/80 pt-2.5">
        <BetLine label={firstName(player.name)} person={player} bet={game.theirs} game={game} />
        {me && <BetLine label="Toi" person={me} bet={game.mine} game={game} />}
      </div>
    </div>
  );
}

function BetLine({ label, person, bet, game }: { label: string; person: Person; bet: ComparedBet | null; game: ComparedGame }) {
  const team = bet ? (bet.teamId === game.homeTeam.id ? game.homeTeam : game.awayTeam) : null;
  const won = bet?.result === "WON";
  return (
    <div className="flex items-start gap-2">
      <Avatar name={person.name} image={person.image} size={24} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-zinc-400">{label}</p>
        {bet && team ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Pill tone={won ? "win" : "miss"}>
              <TeamLogo abbreviation={team.abbreviation} size={14} /> {team.abbreviation}
              {bet.basePoints > 0 && <b> +{bet.basePoints}</b>}
            </Pill>
            {bet.margin && (
              <Pill tone={bet.marginPoints > 0 ? "win" : "miss"}>
                <Target className="h-3 w-3" /> {marginLabel(bet.margin)}
                {bet.marginPoints > 0 && <b> +{bet.marginPoints}</b>}
              </Pill>
            )}
            {bet.topScorer && (
              <Pill tone={bet.topScorerPoints > 0 ? "win" : "miss"}>
                <Star className="h-3 w-3" /> {bet.topScorer.split(" ").slice(-1)[0]}
                {bet.topScorerPoints > 0 && <b> +{bet.topScorerPoints}</b>}
              </Pill>
            )}
            {bet.comboPoints > 0 && (
              <Pill tone="combo"><Zap className="h-3 w-3" /> Combo <b>+{bet.comboPoints}</b></Pill>
            )}
            {!bet.margin && !bet.topScorer && <span className="text-[11px] text-zinc-600">sans bonus</span>}
          </div>
        ) : (
          <p className="mt-0.5 text-xs text-zinc-600">Pas de prono</p>
        )}
      </div>
      <span className={`w-10 flex-shrink-0 pt-3 text-right text-base font-black tabular-nums ${bet && bet.points > 0 ? "text-emerald-400" : "text-zinc-600"}`}>
        {bet ? (bet.points > 0 ? `+${bet.points}` : "0") : "–"}
      </span>
    </div>
  );
}

function Pill({ tone, children }: { tone: "win" | "miss" | "combo"; children: React.ReactNode }) {
  const cls =
    tone === "win" ? "bg-emerald-500/15 text-emerald-300" :
    tone === "combo" ? "bg-purple-500/15 text-purple-300" :
    "bg-zinc-800/80 text-zinc-500 line-through decoration-zinc-600";
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}
