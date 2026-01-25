"use client";

import { FriendCard } from "./friend-card";
import { UserX } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface FriendsListProps {
  friends: Friend[];
  onRemove: (friendId: string) => void;
  isLoading?: boolean;
}

export function FriendsList({
  friends,
  onRemove,
  isLoading = false,
}: FriendsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-48 animate-pulse"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800" />
              <div className="h-4 w-24 bg-zinc-800 rounded" />
              <div className="h-3 w-32 bg-zinc-800 rounded" />
              <div className="flex gap-2 w-full mt-2">
                <div className="flex-1 h-8 bg-zinc-800 rounded" />
                <div className="flex-1 h-8 bg-zinc-800 rounded" />
                <div className="w-8 h-8 bg-zinc-800 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <UserX className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="text-zinc-400 text-center mb-2">
          Aucun ami pour le moment
        </p>
        <p className="text-zinc-600 text-sm text-center">
          Utilisez l'onglet "Rechercher" pour trouver des amis
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {friends.map((friend) => (
        <FriendCard
          key={friend.id}
          friend={friend}
          onRemove={() => onRemove(friend.id)}
        />
      ))}
    </div>
  );
}
