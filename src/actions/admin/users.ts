"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Vérifier que l'utilisateur est admin
 */
async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }

  return session.user;
}

/**
 * Bannir un utilisateur
 */
export async function banUserAction({
  userId,
  reason,
  expires,
}: {
  userId: string;
  reason: string;
  expires?: Date | null;
}) {
  try {
    await requireAdmin();

    // Ne pas permettre de se bannir soi-même
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id === userId) {
      return {
        success: false,
        error: "Vous ne pouvez pas vous bannir vous-même",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: true,
        banReason: reason,
        banExpires: expires || null,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[banUserAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Débannir un utilisateur
 */
export async function unbanUserAction({ userId }: { userId: string }) {
  try {
    await requireAdmin();

    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[unbanUserAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Changer le rôle d'un utilisateur
 */
export async function changeUserRoleAction({
  userId,
  role,
}: {
  userId: string;
  role: "USER" | "ADMIN";
}) {
  try {
    const admin = await requireAdmin();

    // Ne pas permettre de changer son propre rôle
    if (admin.id === userId) {
      return {
        success: false,
        error: "Vous ne pouvez pas modifier votre propre rôle",
      };
    }

    // Mettre à jour le rôle via Prisma
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[changeUserRoleAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Supprimer un utilisateur (action destructive)
 */
export async function deleteUserAction({ userId }: { userId: string }) {
  try {
    const admin = await requireAdmin();

    // Ne pas permettre de se supprimer soi-même
    if (admin.id === userId) {
      return {
        success: false,
        error: "Vous ne pouvez pas supprimer votre propre compte",
      };
    }

    // Supprimer l'utilisateur (cascade sur predictions, badges, etc.)
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[deleteUserAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Basculer le statut de ban d'un utilisateur (ban si actif, unban si banni)
 */
export async function toggleBanUserAction({
  userId,
  reason,
}: {
  userId: string;
  reason?: string;
}) {
  try {
    await requireAdmin();

    // Ne pas permettre de se bannir soi-même
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id === userId) {
      return {
        success: false,
        error: "Vous ne pouvez pas vous bannir vous-même",
      };
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { banned: true },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // Basculer le statut
    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: !user.banned,
        banReason: !user.banned ? reason || "Aucune raison fournie" : null,
        banExpires: null,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, banned: !user.banned };
  } catch (error) {
    console.error("[toggleBanUserAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
