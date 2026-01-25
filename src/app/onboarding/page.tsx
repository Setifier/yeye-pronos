import { requireAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingClient } from "./onboarding-client";

/**
 * Page Onboarding: Première connexion d'un nouvel utilisateur
 *
 * Permet de configurer:
 * - Nom complet (prénom, particule, nom, surnom)
 * - Équipe favorite
 * - Joueur favori
 * - Avatar (optionnel)
 *
 * Accessible uniquement si hasCompletedOnboarding = false
 * Redirige vers /dashboard si déjà complété
 */
export default async function OnboardingPage() {
  // Vérifier l'authentification de manière sécurisée
  const session = await requireAuth("/onboarding");

  // Vérifier si l'onboarding est déjà complété
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      hasCompletedOnboarding: true,
      name: true,
    },
  });

  if (user?.hasCompletedOnboarding) {
    redirect("/dashboard");
  }

  // Récupérer toutes les équipes pour la sélection
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      abbreviation: true,
      logoUrl: true,
      conference: true,
      primaryColor: true,
      secondaryColor: true,
    },
    orderBy: [{ conference: "asc" }, { city: "asc" }],
  });

  return (
    <OnboardingClient
      userId={session.user.id}
      initialName={user?.name || ""}
      teams={teams}
    />
  );
}
