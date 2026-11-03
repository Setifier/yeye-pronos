import { requireAuth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default async function Dashboard() {
  // Récupérer la session de manière sécurisée (gère les cookies orphelins)
  const session = await requireAuth("/dashboard");

  // Charger l'utilisateur depuis la DB
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      image: true,
      createdAt: true,
      hasCompletedOnboarding: true,
    },
  });

  // Si l'onboarding n'est pas complété → Rediriger vers onboarding
  if (!user?.hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  // Afficher le dashboard
  return (
    <DashboardPage
      userId={session.user.id}
      userName={session.user.name}
      userCreatedAt={user.createdAt.toISOString()}
      userImage={user?.image || null}
    />
  );
}
