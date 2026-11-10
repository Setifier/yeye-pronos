"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, UserPlus, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string;
  image: string | null;
  friendCode: string | null;
}

interface UserSearchProps {
  onSendRequest: (userId: string) => void;
  sendingToId?: string | null;
}

export function UserSearch({ onSendRequest, sendingToId = null }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          if (data.success) {
            setResults(data.users);
          }
        } catch (error) {
          console.error("Search error:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="Rechercher par nom ou code (#A7K3M)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Info */}
      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-zinc-500 text-center">
          Tapez au moins 2 caractères pour rechercher
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => {
            const isSending = sendingToId === user.id;

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-[#5096ff]/30 rounded-xl transition-all hover:shadow-lg hover:shadow-[#5096ff]/5"
              >
                <Link href={`/joueur/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5096ff] to-[#3b7dd8] flex items-center justify-center text-white font-bold text-lg ring-2 ring-zinc-800">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate font-mono">
                      {user.friendCode || `#${user.id.slice(0, 8)}`}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={() => onSendRequest(user.id)}
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#5096ff]/10 hover:bg-[#5096ff] border border-[#5096ff]/50 hover:border-[#5096ff] text-[#5096ff] hover:text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Ajouter
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && query.length >= 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Users className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-center">Aucun utilisateur trouvé</p>
          <p className="text-zinc-600 text-sm text-center mt-1">
            Essayez une autre recherche
          </p>
        </div>
      )}
    </div>
  );
}
