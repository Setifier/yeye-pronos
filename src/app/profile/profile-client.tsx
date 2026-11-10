"use client";

import { PlayerProfileView } from "@/components/profile/player-profile";
import type { PublicProfile } from "@/lib/public-profile";

export function ProfileClient({ profile, isOwnProfile = false }: { profile: PublicProfile; isOwnProfile?: boolean }) {
  return <PlayerProfileView profile={profile} isOwnProfile={isOwnProfile} />;
}
