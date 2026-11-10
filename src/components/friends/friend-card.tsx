"use client";

import Link from "next/link";
import { User, BarChart3, UserMinus, ClipboardList } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  image: string | null;
  friendCode?: string | null;
}

interface FriendCardProps {
  friend: Friend;
  onRemove: () => void;
}

function FriendAvatar({ friend, size }: { friend: Friend; size: "sm" | "lg" }) {
  const box = size === "sm" ? "h-12 w-12 text-lg" : "h-20 w-20 text-2xl";
  return friend.image ? (
    <img
      src={friend.image}
      alt={friend.name}
      className={`${box} rounded-full object-cover ring-2 ring-zinc-800 transition-all group-hover:ring-[#5096ff]`}
    />
  ) : (
    <div className={`${box} flex items-center justify-center rounded-full bg-gradient-to-br from-[#5096ff] to-[#3b7dd8] font-bold text-white ring-2 ring-zinc-800 transition-all group-hover:ring-[#5096ff]`}>
      {friend.name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Téléphone : une ligne (fiche, pronos, comparer, retirer). Ordinateur : la grande carte. */
export function FriendCard(props: FriendCardProps) {
  return (
    <>
      <div className="md:hidden"><MobileFriendRow {...props} /></div>
      <div className="hidden md:block"><DesktopFriendCard {...props} /></div>
    </>
  );
}

function MobileFriendRow({ friend, onRemove }: FriendCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
      <Link href={`/joueur/${friend.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70">
        <FriendAvatar friend={friend} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-bold text-white">{friend.name}</span>
          <span className="block truncate font-mono text-[11px] text-zinc-500">{friend.friendCode || `#${friend.id.slice(0, 8)}`}</span>
        </span>
      </Link>
      <div className="flex flex-shrink-0 items-center gap-1">
        <Link href={`/joueur/${friend.id}/pronos`} aria-label={`Pronos de ${friend.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-[#5096ff] active:bg-zinc-700">
          <ClipboardList className="h-4 w-4" />
        </Link>
        <Link href={`/comparer/${friend.id}`} aria-label={`Comparer avec ${friend.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 active:bg-zinc-700">
          <BarChart3 className="h-4 w-4" />
        </Link>
        <button type="button" onClick={onRemove} aria-label={`Retirer ${friend.name} de mes amis`}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 active:bg-red-500/10 active:text-red-400">
          <UserMinus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DesktopFriendCard({ friend, onRemove }: FriendCardProps) {
  return (
    <div className="group bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 transition-all hover:shadow-xl hover:shadow-[#5096ff]/5">
      <div className="flex flex-col items-center gap-4">
        {/* Avatar */}
        <Link href={`/joueur/${friend.id}`} className="relative">
          <div className="relative cursor-pointer">
            <FriendAvatar friend={friend} size="lg" />
            <div className="absolute inset-0 rounded-full bg-[#5096ff]/0 group-hover:bg-[#5096ff]/10 transition-all" />
          </div>
        </Link>

        {/* Nom */}
        <div className="text-center w-full">
          <Link href={`/joueur/${friend.id}`}>
            <h3 className="font-bold text-white group-hover:text-[#5096ff] transition-colors truncate">
              {friend.name}
            </h3>
          </Link>
          <p className="text-xs text-zinc-500 truncate font-mono mt-1">
            {friend.friendCode || `#${friend.id.slice(0, 8)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full">
          <Link
            href={`/joueur/${friend.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800/50 hover:bg-[#5096ff]/10 border border-zinc-700 hover:border-[#5096ff] text-zinc-300 hover:text-[#5096ff] rounded-lg transition-all text-xs font-medium"
          >
            <User className="w-3.5 h-3.5" />
            Profil
          </Link>

          <Link
            href={`/comparer/${friend.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800/50 hover:bg-[#5096ff]/10 border border-zinc-700 hover:border-[#5096ff] text-zinc-300 hover:text-[#5096ff] rounded-lg transition-all text-xs font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Comparer
          </Link>

          <button
            onClick={onRemove}
            className="p-2.5 bg-zinc-800/50 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-500 rounded-lg transition-all"
            title="Retirer cet ami"
          >
            <UserMinus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
