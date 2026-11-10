import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPublicProfile } from "@/lib/public-profile";
import { JoueurProfileClient } from "./joueur-profile-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Fiche d'un joueur de l'app (depuis le classement, les amis…). Sa propre fiche → /profile. */
export default async function JoueurPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth(`/joueur/${id}`);
  if (id === session.user.id) redirect("/profile");

  const profile = await getPublicProfile(prisma, id, session.user.id);
  if (!profile) notFound();

  return <JoueurProfileClient profile={profile} />;
}
