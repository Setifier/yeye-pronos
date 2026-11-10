"use client";

import { PlayerProfileView } from "@/components/profile/player-profile";
import type { PublicProfile } from "@/lib/public-profile";

/** Fiche d'un autre joueur : ses pronos, ajouter en ami, comparer. */
export function JoueurProfileClient({ profile }: { profile: PublicProfile }) {
  return <PlayerProfileView profile={profile} isOwnProfile={false} />;
}
