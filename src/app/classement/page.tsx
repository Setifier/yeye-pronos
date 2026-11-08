"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2, Medal, Trophy, Users } from "lucide-react";
import { getCurrentSeason, getSeasonLabel } from "@/types/season";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  image: string | null;
  totalPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  totalPoints: number;
  matchPoints: number;
  specialPoints: number;
  winRate: number;
  isCurrentUser: boolean;
}

interface ClassementResponse {
  season: string;
  seasons: string[];
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  totalPlayers: number;
}

export default function ClassementPage() {
  const [season, setSeason] = useState<string>(getCurrentSeason());
  const [data, setData] = useState<ClassementResponse | null>(null);
  const [seasons, setSeasons] = useState<string[]>([getCurrentSeason()]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/classement?season=${season}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ClassementResponse) => {
        if (cancelled) return;
        setData(d);
        setSeasons((prev) => [...new Set([getCurrentSeason(), ...prev, ...d.seasons])].sort().reverse());
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [season]);

  const list = data?.leaderboard ?? [];
  const podium = list.slice(0, 3);
  const me = list.find((e) => e.isCurrentUser);

  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-black tracking-tight text-white">Classement</h1>
          <p className="text-sm text-zinc-500">Pronos des matchs + paris de saison</p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[...seasons, "all"].map((s) => (
              <button
                key={s}
                onClick={() => setSeason(s)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  season === s ? "bg-[#5096ff] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {s === "all" ? "Toutes saisons" : `Saison ${getSeasonLabel(s)}`}
              </button>
            ))}
          </div>

          {data && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-[#5096ff]" /><b className="text-white">{data.totalPlayers}</b> joueur{data.totalPlayers > 1 ? "s" : ""}</span>
              {me && (
                <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-[#dcff50]" />Toi : <b className="text-[#dcff50]">{me.rank}{me.rank === 1 ? "er" : "e"}</b> · {me.totalPoints} pts</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#5096ff]" /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            {season === getCurrentSeason() ? "Personne n'a encore marqué de points cette saison. À toi de lancer le bal !" : "Aucun joueur classé pour cette saison."}
          </div>
        ) : (
          <>
            {/* Podium */}
            <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
              {[podium[1], podium[0], podium[2]].map((e, i) =>
                e ? <PodiumCard key={e.id} entry={e} tall={i === 1} /> : <div key={i} />
              )}
            </div>

            {/* Liste */}
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
              <div className="hidden grid-cols-[3rem_1fr_7rem_5rem_5rem] gap-2 border-b border-zinc-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:grid">
                <span>Rang</span><span>Joueur</span><span className="text-center">Réussis</span><span className="text-center">Réussite</span><span className="text-right">Points</span>
              </div>
              <ol className="divide-y divide-zinc-800/80">
                {list.map((e) => (
                  <li
                    key={e.id}
                    className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[3rem_1fr_7rem_5rem_5rem] ${
                      e.isCurrentUser ? "bg-[#5096ff]/10" : ""
                    }`}
                  >
                    <span className={`text-sm font-bold ${e.rank === 1 ? "text-yellow-400" : e.rank === 2 ? "text-zinc-300" : e.rank === 3 ? "text-orange-400" : "text-zinc-500"}`}>
                      {e.rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={e.name} image={e.image} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">
                          {e.name}{e.isCurrentUser && <span className="ml-1.5 text-xs text-[#5096ff]">(toi)</span>}
                        </span>
                        <span className="block text-[11px] text-zinc-500 sm:hidden">
                          {e.wonPredictions}/{e.wonPredictions + e.lostPredictions} · {e.winRate}%
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-center text-sm text-zinc-300 sm:block">
                      <b className="text-green-400">{e.wonPredictions}</b>
                      <span className="text-zinc-600"> / {e.wonPredictions + e.lostPredictions}</span>
                    </span>
                    <span className="hidden text-center text-sm font-semibold text-[#5096ff] sm:block">{e.winRate}%</span>
                    <span className="text-right">
                      <span className="block text-base font-bold tabular-nums text-white">{e.totalPoints}</span>
                      {e.specialPoints > 0 && <span className="block text-[10px] text-zinc-500">dont {e.specialPoints} saison</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, image, size }: { name: string; image: string | null; size: number }) {
  return image ? (
    <img src={image} alt="" className="flex-shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5096ff] to-[#ff5050] font-bold text-white"
      style={{ width: size, height: size, fontSize: size / 2.8 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function PodiumCard({ entry, tall }: { entry: LeaderboardEntry; tall: boolean }) {
  const style =
    entry.rank === 1 ? { ring: "border-yellow-500/40 from-yellow-500/15", icon: <Crown className="h-4 w-4 text-yellow-400" /> } :
    entry.rank === 2 ? { ring: "border-zinc-400/30 from-zinc-400/10", icon: <Medal className="h-4 w-4 text-zinc-300" /> } :
                       { ring: "border-orange-500/30 from-orange-500/10", icon: <Medal className="h-4 w-4 text-orange-400" /> };
  return (
    <div className={`flex flex-col items-center rounded-2xl border bg-gradient-to-b to-transparent px-2 text-center ${style.ring} ${tall ? "pb-5 pt-6" : "pb-4 pt-4"} ${entry.isCurrentUser ? "ring-2 ring-[#5096ff]" : ""}`}>
      <span className="mb-2 flex items-center gap-1 text-xs font-bold text-zinc-300">{style.icon}{entry.rank}</span>
      <Avatar name={entry.name} image={entry.image} size={tall ? 64 : 48} />
      <p className="mt-2 w-full truncate text-sm font-semibold text-white">{entry.name}</p>
      <p className="text-lg font-black tabular-nums text-[#dcff50]">{entry.totalPoints}</p>
      <p className="text-[11px] text-zinc-500">{entry.winRate}% réussite</p>
    </div>
  );
}
