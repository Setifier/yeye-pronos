"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive, ArrowLeft, ChevronDown, ChevronRight, ClipboardList, Crown, Loader2, Medal, Percent, Star, Target, Trophy, User,
  Users, Zap, type LucideIcon,
} from "lucide-react";
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
  // Ligne dépliée : détail des points du joueur
  const [openId, setOpenId] = useState<string | null>(null);

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
                <RankRow
                  key={r.player.id}
                  row={r}
                  open={openId === r.player.id}
                  onToggle={() => setOpenId((id) => (id === r.player.id ? null : r.player.id))}
                  archived={archived}
                />
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

/** Une ligne du classement : un toucher déplie le détail des points (et les liens vers ses pronos, sa fiche). */
function RankRow({ row: r, open, onToggle, archived }: { row: BoardRow; open: boolean; onToggle: () => void; archived: boolean }) {
  const p = r.player;
  return (
    <li className={p.isCurrentUser ? "bg-[#5096ff]/10" : ""}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`grid w-full grid-cols-[2.5rem_1fr_auto_1rem] items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50 active:bg-zinc-800/70 sm:grid-cols-[3rem_1fr_auto_1rem] ${
          r.empty && !open ? "opacity-60" : ""
        }`}
      >
        <span className={`text-sm font-bold ${rankColor(r.rank)}`}>{r.rank ?? "–"}</span>
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} image={p.image} size={36} />
          <span className="block truncate text-sm font-medium text-white">
            {p.name}
            {p.isCurrentUser && <span className="ml-1.5 text-xs text-[#5096ff]">(toi)</span>}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-base font-bold tabular-nums text-white">
            {r.value}
            {r.unit && <span className="ml-1 text-[11px] font-semibold text-zinc-500">{r.unit}</span>}
          </span>
          {r.sub && <span className="block text-[10px] text-zinc-500">{r.sub}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <PointsDetail player={p} archived={archived} />}
    </li>
  );
}

/** D'où viennent ses points : bons vainqueurs, écarts, marqueurs, combos, paris de début de saison. */
function PointsDetail({ player: p, archived }: { player: BoardPlayer; archived: boolean }) {
  const base = Math.max(0, p.matchPoints - p.marginPoints - p.scorerPoints - p.comboPoints);
  const lines: { label: string; count: number | null; points: number | null; icon: LucideIcon; tint: string }[] = [
    { label: "Bons vainqueurs",          count: p.won,        points: base,           icon: Trophy, tint: "text-emerald-400" },
    { label: "Bons écarts",              count: p.marginHits, points: p.marginPoints, icon: Target, tint: "text-orange-400" },
    { label: "Meilleurs marqueurs",      count: p.scorerHits, points: p.scorerPoints, icon: Star,   tint: "text-cyan-400" },
    { label: "Combos ultimes",           count: p.comboHits,  points: p.comboPoints,  icon: Zap,    tint: "text-purple-300" },
    // Paris de début de saison : points attribués au fil des résultats (NBA Cup, fin de saison)
    { label: "Paris de début de saison", count: null,         points: p.specialPoints > 0 || archived ? p.specialPoints : null, icon: Medal, tint: "text-amber-400" },
  ];
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950/40 px-4 pb-4 pt-3">
      <ul className="space-y-1.5">
        {lines.map(({ label, count, points, icon: Icon, tint }) => (
          <li key={label} className="flex items-center gap-2 text-sm">
            <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${tint}`} />
            <span className="min-w-0 flex-1 truncate text-zinc-300">
              {label}
              {count !== null && <span className="text-zinc-500"> · {count}</span>}
            </span>
            <span className={`flex-shrink-0 font-bold tabular-nums ${points ? "text-white" : "text-zinc-500"}`}>
              {points === null ? <span className="text-xs font-medium">à venir</span> : `+${fmt(points)}`}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-zinc-800/60 pt-1.5 text-sm">
          <span className="font-semibold text-zinc-400">Total</span>
          <span className="font-black tabular-nums text-[#dcff50]">{fmt(p.points)} pts</span>
        </li>
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={p.isCurrentUser ? "/pronos/matchs" : `/joueur/${p.id}/pronos`}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-white hover:bg-zinc-700"
        >
          <ClipboardList className="h-4 w-4 text-[#5096ff]" /> {p.isCurrentUser ? "Mes pronos" : "Ses pronos"}
        </Link>
        <Link
          href={profileHref(p)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-white hover:bg-zinc-700"
        >
          <User className="h-4 w-4 text-zinc-400" /> {p.isCurrentUser ? "Mon profil" : "Sa fiche"}
        </Link>
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
        {row.unit && <span className="ml-0.5 text-xs font-bold">{row.unit}</span>}
      </p>
      {row.sub && <p className="text-[11px] text-zinc-500">{row.sub}</p>}
    </Link>
  );
}
