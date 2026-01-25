import { notFound } from "next/navigation";
import { JoueurProfileClient } from "./joueur-profile-client";
import { cookies } from "next/headers";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPublicProfile(userId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
      console.error("Public profile API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return null;
  }
}

export default async function JoueurPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  return <JoueurProfileClient profile={profile} />;
}
