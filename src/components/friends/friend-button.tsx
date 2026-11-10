"use client";

import { useState } from "react";
import { Check, Clock, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { acceptFriendRequestAction, sendFriendRequestAction } from "@/actions/friends";
import type { Friendship } from "@/lib/public-profile";

/**
 * Bouton d'amitié de la fiche d'un joueur :
 * « Ajouter en ami » → « Demande envoyée » ; « Accepter sa demande » si c'est lui qui a demandé ;
 * « Ami » avec une coche quand c'est fait.
 */
export function FriendButton({ targetUserId, targetName, initial, className = "" }: {
  targetUserId: string;
  targetName: string;
  initial: Friendship;
  className?: string;
}) {
  const [state, setState] = useState<Friendship>(initial);
  const [busy, setBusy] = useState(false);

  if (state.status === "self") return null;

  const base = `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-60 ${className}`;

  if (state.status === "friends") {
    return (
      <span className={`${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-400`}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-3.5 w-3.5 stroke-[3] text-zinc-950" />
        </span>
        Ami
      </span>
    );
  }

  if (state.status === "sent") {
    return (
      <span className={`${base} border border-zinc-700 bg-zinc-800/60 text-zinc-400`}>
        <Clock className="h-4 w-4" /> Demande envoyée
      </span>
    );
  }

  const add = async () => {
    setBusy(true);
    const res = await sendFriendRequestAction({ targetUserId }).catch(() => ({ success: false as const, error: undefined }));
    setBusy(false);
    if (res.success) {
      setState({ status: "sent", requestId: null });
      toast.success("Demande d'ami envoyée", { description: `${targetName} doit l'accepter.` });
    } else {
      toast.error(res.error || "La demande n'est pas partie");
    }
  };

  const accept = async () => {
    if (!state.requestId) return;
    setBusy(true);
    const res = await acceptFriendRequestAction({ requestId: state.requestId }).catch(() => ({ success: false as const, error: undefined }));
    setBusy(false);
    if (res.success) {
      setState({ status: "friends", requestId: null });
      toast.success(`Toi et ${targetName} êtes amis`);
    } else {
      toast.error(res.error || "Impossible d'accepter la demande");
    }
  };

  const received = state.status === "received";
  return (
    <button
      type="button"
      onClick={received ? accept : add}
      disabled={busy}
      className={`${base} bg-[#5096ff] text-white hover:bg-[#5096ff]/90 active:scale-95`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : received ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {received ? "Accepter sa demande" : "Ajouter en ami"}
    </button>
  );
}
