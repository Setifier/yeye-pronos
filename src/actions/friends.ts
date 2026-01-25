"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { notifyFriendRequest } from "@/lib/notification-service";

/**
 * Vérifier que l'utilisateur est authentifié
 */
async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized - Authentication required");
  }

  return session.user;
}

/**
 * Envoyer une demande d'ami
 */
export async function sendFriendRequestAction({
  targetUserId,
}: {
  targetUserId: string;
}) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    // 1. Vérifier qu'on ne s'envoie pas à soi-même
    if (userId === targetUserId) {
      return {
        success: false,
        error: "Vous ne pouvez pas vous ajouter vous-même",
      };
    }

    // 2. Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // 3. Vérifier qu'une demande n'existe pas déjà
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return { success: false, error: "Demande déjà envoyée" };
      }
      if (existingRequest.status === "ACCEPTED") {
        return { success: false, error: "Vous êtes déjà amis" };
      }
      // Si REJECTED, on supprime et on recrée
      if (existingRequest.status === "REJECTED") {
        await prisma.friendRequest.delete({
          where: { id: existingRequest.id },
        });
      }
    }

    // 4. Créer la demande
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: targetUserId,
        status: "PENDING",
      },
    });

    // 5. Notifier le destinataire
    try {
      await notifyFriendRequest({
        userId: targetUserId,
        senderName: user.name,
        requestId: friendRequest.id,
      });
    } catch (notifError) {
      console.error("[sendFriendRequestAction] Notification error:", notifError);
    }

    revalidatePath("/amis");
    return { success: true };
  } catch (error) {
    console.error("[sendFriendRequestAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Accepter une demande d'ami
 */
export async function acceptFriendRequestAction({
  requestId,
}: {
  requestId: string;
}) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    // 1. Vérifier que la demande existe
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { select: { name: true } },
      },
    });

    if (!friendRequest) {
      return { success: false, error: "Demande introuvable" };
    }

    // 2. Vérifier qu'on est le receiver
    if (friendRequest.receiverId !== userId) {
      return {
        success: false,
        error: "Vous n'êtes pas le destinataire de cette demande",
      };
    }

    // 3. Vérifier que le statut est PENDING
    if (friendRequest.status !== "PENDING") {
      return {
        success: false,
        error: `Demande déjà ${friendRequest.status.toLowerCase()}`,
      };
    }

    // 4. Accepter
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    revalidatePath("/amis");
    return {
      success: true,
      message: `Vous êtes maintenant ami avec ${friendRequest.sender.name}`,
    };
  } catch (error) {
    console.error("[acceptFriendRequestAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Refuser une demande d'ami
 */
export async function rejectFriendRequestAction({
  requestId,
}: {
  requestId: string;
}) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    // 1. Vérifier que la demande existe
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!friendRequest) {
      return { success: false, error: "Demande introuvable" };
    }

    // 2. Vérifier qu'on est le receiver
    if (friendRequest.receiverId !== userId) {
      return {
        success: false,
        error: "Vous n'êtes pas le destinataire de cette demande",
      };
    }

    // 3. Vérifier que le statut est PENDING
    if (friendRequest.status !== "PENDING") {
      return {
        success: false,
        error: `Demande déjà ${friendRequest.status.toLowerCase()}`,
      };
    }

    // 4. Refuser
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    revalidatePath("/amis");
    return { success: true };
  } catch (error) {
    console.error("[rejectFriendRequestAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Retirer un ami
 */
export async function removeFriendAction({ friendId }: { friendId: string }) {
  try {
    const user = await requireAuth();
    const userId = user.id;

    // Supprimer la FriendRequest (dans les 2 sens)
    const deleted = await prisma.friendRequest.deleteMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (deleted.count === 0) {
      return { success: false, error: "Amitié introuvable" };
    }

    revalidatePath("/amis");
    return { success: true };
  } catch (error) {
    console.error("[removeFriendAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
