import { requireAuth } from "@/lib/auth-helpers";
import { ProfileClient } from "./profile-client";
import { cookies } from "next/headers";
import { getAppBaseUrl } from "@/lib/app-url";

async function getUserProfile(userId: string) {
  try {
    const baseUrl = getAppBaseUrl();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(
      `${baseUrl}/api/users/${userId}/public-profile`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    if (!response.ok) {
      console.error("Profile API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export default async function ProfilePage() {
  // Récupérer la session de manière sécurisée
  const session = await requireAuth("/profile");

  // Récupérer le profil complet de l'utilisateur
  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  return <ProfileClient profile={profile} isOwnProfile={true} />;
}
