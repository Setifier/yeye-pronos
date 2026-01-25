"use client";

import { Check, X, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FriendRequest {
  id: string;
  createdAt: Date | string;
  sender: {
    id: string;
    name: string;
    image: string | null;
    friendCode: string | null;
  };
}

interface FriendRequestsListProps {
  requests: FriendRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isLoading?: boolean;
  processingId?: string | null;
}

export function FriendRequestsList({
  requests,
  onAccept,
  onReject,
  isLoading = false,
  processingId = null,
}: FriendRequestsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-zinc-800" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-24 h-9 bg-zinc-800 rounded" />
                <div className="w-24 h-9 bg-zinc-800 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <Inbox className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="text-zinc-400 text-center">
          Aucune demande d'ami en attente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const isProcessing = processingId === request.id;

        return (
          <div
            key={request.id}
            className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-[#5096ff]/30 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-[#5096ff]/5"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Sender info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {request.sender.image ? (
                  <img
                    src={request.sender.image}
                    alt={request.sender.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-800"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5096ff] to-[#3b7dd8] flex items-center justify-center text-white font-bold text-lg ring-2 ring-zinc-800">
                    {request.sender.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {request.sender.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(request.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#5096ff]/10 hover:bg-[#5096ff] border border-[#5096ff]/50 hover:border-[#5096ff] text-[#5096ff] hover:text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Accepter
                </button>
                <button
                  onClick={() => onReject(request.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Refuser
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
