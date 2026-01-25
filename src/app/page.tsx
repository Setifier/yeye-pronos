import { getSafeSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LandingPage from "@/components/landing-page";

export default async function Home() {
  // Récupérer la session de manière sécurisée (gère les cookies orphelins)
  const session = await getSafeSession();

  // Connecté → Vérifier l'onboarding et rediriger
  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasCompletedOnboarding: true },
    });

    // Rediriger vers onboarding si pas complété, sinon dashboard
    if (!user?.hasCompletedOnboarding) {
      redirect("/onboarding");
    } else {
      redirect("/dashboard");
    }
  }

  // Non connecté → Landing page
  return <LandingPage />;
}
