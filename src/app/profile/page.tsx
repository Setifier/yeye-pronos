import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPublicProfile } from "@/lib/public-profile";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await requireAuth("/profile");
  const profile = await getPublicProfile(prisma, session.user.id, session.user.id).catch((err) => {
    console.error("[profile]", err);
    return null;
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  return <ProfileClient profile={profile} isOwnProfile={true} />;
}
