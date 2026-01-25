"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

interface CompleteOnboardingData {
  firstName: string;
  lastName: string;
  particle?: string;
  nickname: string; // OBLIGATOIRE maintenant
  favoriteTeamId: string;
  favoritePlayerId: string;
  avatarUrl?: string;
  skip?: boolean; // Flag pour utiliser les valeurs par défaut
}

/**
 * Action: Complete User Onboarding
 *
 * Validates and saves all onboarding data for a new user:
 * - Nickname (REQUIRED - becomes the display name)
 * - Optional: Full name configuration (first, particle, last)
 * - Favorite team selection
 * - Favorite player selection
 * - Optional avatar URL
 *
 * Sets hasCompletedOnboarding to true after successful completion.
 */
export async function completeOnboardingAction(data: CompleteOnboardingData) {
  try {
    // 1. Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { error: "Non authentifié" };
    }

    const userId = session.user.id;

    // 2. Handle skip mode - generate default values
    if (data.skip) {
      // Récupérer le friendCode de l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { friendCode: true },
      });

      // Si pas de friendCode, en générer un (pour les anciens utilisateurs)
      let friendCode = user?.friendCode;
      if (!friendCode) {
        const { generateUniqueFriendCode } = await import("@/lib/friend-code");
        friendCode = await generateUniqueFriendCode();

        // Mettre à jour l'utilisateur avec le nouveau friendCode
        await prisma.user.update({
          where: { id: userId },
          data: { friendCode },
        });
      }

      // Générer un surnom par défaut : User[friendCode]
      // Le friendCode contient déjà le #
      const defaultNickname = `User${friendCode}`;

      // Mettre à jour l'utilisateur avec les valeurs par défaut
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: defaultNickname,
          hasCompletedOnboarding: true,
          // Pas d'équipe/joueur/avatar favoris
        },
      });

      // Revalidate relevant paths
      revalidatePath("/");
      revalidatePath("/profile");
      revalidatePath("/dashboard");

      return { error: null };
    }

    // 3. Validate required fields (mode normal)
    // SURNOM OBLIGATOIRE
    if (!data.nickname?.trim()) {
      return { error: "Le surnom est requis" };
    }

    if (!data.favoriteTeamId || !data.favoritePlayerId) {
      return { error: "L'équipe et le joueur favoris sont requis" };
    }

    // 4. Validate name format (no spaces, only letters and hyphens)
    const nameRegex = /^[a-zA-ZÀ-ÿ\-]+$/;

    // Nickname validation (obligatoire)
    if (!nameRegex.test(data.nickname)) {
      return { error: "Le surnom ne peut contenir que des lettres et des tirets" };
    }

    // Prénom/Nom optionnels - valider seulement s'ils sont fournis
    if (data.firstName && !nameRegex.test(data.firstName)) {
      return { error: "Le prénom ne peut contenir que des lettres et des tirets" };
    }

    if (data.lastName && !nameRegex.test(data.lastName)) {
      return { error: "Le nom ne peut contenir que des lettres et des tirets" };
    }

    // 5. Check if team exists
    const teamExists = await prisma.team.findUnique({
      where: { id: data.favoriteTeamId },
    });

    if (!teamExists) {
      return { error: "L'équipe sélectionnée n'existe pas" };
    }

    // 6. Check if player exists
    const playerExists = await prisma.player.findUnique({
      where: { id: data.favoritePlayerId },
    });

    if (!playerExists) {
      return { error: "Le joueur sélectionné n'existe pas" };
    }

    // 7. Build display name
    // Priority: Full name (if provided) OR Nickname
    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    let displayName: string;

    if (data.firstName?.trim() && data.lastName?.trim()) {
      // Si prénom et nom fournis → construire le nom complet
      const firstName = capitalize(data.firstName.trim());
      const lastName = capitalize(data.lastName.trim());
      const particle = data.particle?.trim() || "";

      displayName = particle
        ? `${firstName} ${particle} ${lastName}`
        : `${firstName} ${lastName}`;
    } else {
      // Sinon → utiliser le surnom comme nom d'affichage
      displayName = capitalize(data.nickname.trim());
    }

    // 8. Update user with all onboarding data
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: displayName,
        favoriteTeamId: data.favoriteTeamId,
        favoritePlayerId: data.favoritePlayerId,
        hasCompletedOnboarding: true,
        ...(data.avatarUrl && { image: data.avatarUrl }),
      },
    });

    // 9. Revalidate relevant paths
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { error: null };
  } catch (error) {
    console.error("[Complete Onboarding] Error:", error);
    return {
      error: "Une erreur est survenue lors de la finalisation de votre profil",
    };
  }
}
