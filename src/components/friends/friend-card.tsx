"use client";

import Link from "next/link";
import { User, BarChart3, UserMinus } from "lucide-react";

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

export function FriendCard({ friend, onRemove }: FriendCardProps) {
  return (
    <div className="group bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 transition-all hover:shadow-xl hover:shadow-[#5096ff]/5">
      <div className="flex flex-col items-center gap-4">
        {/* Avatar */}
        <Link href={`/joueur/${friend.id}`} className="relative">
          <div className="relative cursor-pointer">
            {friend.image ? (
              <img
                src={friend.image}
                alt={friend.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-[#5096ff] transition-all"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5096ff] to-[#3b7dd8] flex items-center justify-center text-white font-bold text-2xl ring-2 ring-zinc-800 group-hover:ring-[#5096ff] transition-all">
                {friend.name.charAt(0).toUpperCase()}
              </div>
            )}
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
