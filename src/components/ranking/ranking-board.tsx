"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, ChevronRight, Crown, Loader2, Medal, Percent, Star, Target, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/mobile/ui";
import { BOARDS, buildBoard, type BoardKey, type BoardPlayer, type BoardRow } from "@/lib/ranking-boards";
import { getSeasonLabel } from "@/types/season";

const ICONS: Record<BoardKey, LucideIcon> = {
  points: Trophy,
  reussite: Percent,
  ecarts: Target,
  marqueur: Star,
  combo: Zap,
};

const EMPTY_LINE: Record<BoardKey, string> = {
  points: "Personne n'a encore marqué de points cette saison. À toi de lancer le bal !",
  reussite: "Personne n'a encore assez de pronos terminés pour ce classement.",
  ecarts: "Personne n'a encore trouvé le bon écart.",
  marqueur: "Personne n'a encore trouvé le meilleur marqueur.",
  combo: "Personne n'a encore réussi de combo ultime.",
};

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);
const profileHref = (p: BoardPlayer) => (p.isCurrentUser ? "/profile" : `/joueur/${p.id}`);

/**
 * Classements des pronos d'une saison : Points · Réussite · Bons écarts · Meilleur marqueur · Combo ultime.
 * Page Classement : saison en cours. Archives : une saison passée (`season`).
 */
export function RankingBoard({ season }: { season?: string }) {
  const archived = !!season;
  const [players, setPlayers] = useState<BoardPlayer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [board, setBoard] = useState<BoardKey>("points");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/classement${season ? `?season=${season}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { players: BoardPlayer[] }) => { if (!cancelled) setPlayers(d.players); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [season]);

  const rows = useMemo(() => (players ? buildBoard(players, board) : []), [players, board]);
  const podium = rows.filter((r) => r.rank !== null && !r.empty).slice(0, 3);
  const me = rows.find((r) => r.player.isCurrentUser);
  const meta = BOARDS.find((b) => b.key === board)!;

  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 md:py-6">
          {archived && (
            <Link href="/archives" className="mb-2 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Saisons passées
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Classement</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${archived ? "bg-zinc-800 text-zinc-300" : "bg-[#5096ff]/15 text-[#5096ff]"}`}>
              {season ? `Saison ${getSeasonLabel(season)}` : "Saison en cours"}
            </span>
          </div>

          {/* Les 5 classements */}
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 md:mt-4">
            {BOARDS.map(({ key, label }) => {
              const Icon = ICONS[key];
              const active = key === board;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBoard(key)}
                  aria-pressed={active}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-[#5096ff] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">{meta.hint}</p>

          {players && players.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#5096ff]" />
                <b className="text-white">{players.length}</b> joueur{players.length > 1 ? "s" : ""}
              </span>
              {me && (
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-[#dcff50]" />
                  {me.rank === null ? (
                    <>Toi : pas encore classé ({me.sub})</>
                  ) : (
                    <>Toi : <b className="text-[#dcff50]">{ordinal(me.rank)}</b> · {me.value} {me.unit}</>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 md:py-6">
        {failed ? (
          <p className="py-16 text-center text-zinc-400">Impossible de charger le classement. Réessaie dans un instant.</p>
        ) : !players ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#5096ff]" /></div>
        ) : players.length === 0 ? (
          <p className="py-16 text-center text-zinc-400">
            {archived ? "Aucun joueur classé pour cette saison." : EMPTY_LINE.points}
          </p>
        ) : (
          <>
            {podium.length > 0 ? (
              <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
                {[podium[1], podium[0], podium[2]].map((r, i) =>
                  r ? <PodiumCard key={r.player.id} row={r} tall={i === 1} /> : <div key={i} />
                )}
              </div>
            ) : (
              <p className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-400">
                {EMPTY_LINE[board]}
              </p>
            )}

            <ol className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
              {rows.map((r) => (
                // Toucher un joueur → sa fiche (ses pronos, ajouter en ami)
                <li key={r.player.id}>
                  <Link
                    href={profileHref(r.player)}
                    className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-4 py-3 transition-colors hover:bg-zinc-800/50 active:bg-zinc-800/70 sm:grid-cols-[3rem_1fr_auto] ${
                      r.player.isCurrentUser ? "bg-[#5096ff]/10" : ""
                    } ${r.empty ? "opacity-60" : ""}`}
                  >
                    <span className={`text-sm font-bold ${rankColor(r.rank)}`}>{r.rank ?? "–"}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.player.name} image={r.player.image} size={36} />
                      <span className="block truncate text-sm font-medium text-white">
                        {r.player.name}
                        {r.player.isCurrentUser && <span className="ml-1.5 text-xs text-[#5096ff]">(toi)</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-base font-bold tabular-nums text-white">
                        {r.value}
                        {r.unit && <span className="ml-1 text-[11px] font-semibold text-zinc-500">{r.unit}</span>}
                      </span>
                      {r.sub && <span className="block text-[10px] text-zinc-500">{r.sub}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}

        {!archived && (
          <Link
            href="/archives"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:bg-zinc-900"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
              <Archive className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-white">Saisons passées</span>
              <span className="block text-xs text-zinc-400">Les classements des saisons terminées</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-600" />
          </Link>
        )}
      </div>
    </div>
  );
}

function rankColor(rank: number | null) {
  return rank === 1 ? "text-yellow-400" : rank === 2 ? "text-zinc-300" : rank === 3 ? "text-orange-400" : "text-zinc-500";
}

function PodiumCard({ row, tall }: { row: BoardRow; tall: boolean }) {
  const { player, rank } = row;
  const style =
    rank === 1 ? { ring: "border-yellow-500/40 from-yellow-500/15", icon: <Crown className="h-4 w-4 text-yellow-400" /> } :
    rank === 2 ? { ring: "border-zinc-400/30 from-zinc-400/10", icon: <Medal className="h-4 w-4 text-zinc-300" /> } :
                 { ring: "border-orange-500/30 from-orange-500/10", icon: <Medal className="h-4 w-4 text-orange-400" /> };
  return (
    <Link
      href={profileHref(player)}
      className={`flex flex-col items-center rounded-2xl border bg-gradient-to-b to-transparent px-2 text-center transition-transform active:scale-95 ${style.ring} ${tall ? "pb-5 pt-6" : "pb-4 pt-4"} ${player.isCurrentUser ? "ring-2 ring-[#5096ff]" : ""}`}
    >
      <span className="mb-2 flex items-center gap-1 text-xs font-bold text-zinc-300">{style.icon}{rank}</span>
      <Avatar name={player.name} image={player.image} size={tall ? 64 : 48} />
      <p className="mt-2 w-full truncate text-sm font-semibold text-white">{player.name}</p>
      <p className="text-lg font-black tabular-nums text-[#dcff50]">
        {row.value}
        {row.unit && <span className="ml-0.5 text-xs font-bold">{row.unit === "pts" || row.unit === "%" ? row.unit : ""}</span>}
      </p>
      <p className="text-[11px] text-zinc-500">{row.sub ?? row.unit}</p>
    </Link>
  );
}
