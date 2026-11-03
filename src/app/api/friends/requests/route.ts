import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Friends Requests: Récupérer les demandes d'amis reçues
 * GET /api/friends/requests
 *
 * Retourne les demandes en attente (status = "PENDING")
 * où l'utilisateur est le receiver
 *
 * Protégé: Authentification requise
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer les demandes reçues en attente
    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            friendCode: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("[API Friends Requests GET] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching friend requests",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * API Friends Requests: Envoyer une demande d'ami
 * POST /api/friends/requests
 *
 * Body: { targetUserId: string }
 *
 * Protégé: Authentification requise
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { targetUserId } = body;

    // Validation
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Invalid targetUserId" },
        { status: 400 }
      );
    }

    // 1. Vérifier qu'on ne s'envoie pas à soi-même
    if (userId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // 2. Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // 3. Vérifier qu'une demande n'existe pas déjà (dans les 2 sens)
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
        return NextResponse.json(
          { error: "Friend request already sent" },
          { status: 409 }
        );
      }
      if (existingRequest.status === "ACCEPTED") {
        return NextResponse.json(
          { error: "Already friends" },
          { status: 409 }
        );
      }
      // Si REJECTED, on peut permettre de renvoyer une demande
      // On supprime l'ancienne et on en crée une nouvelle
      if (existingRequest.status === "REJECTED") {
        await prisma.friendRequest.delete({
          where: { id: existingRequest.id },
        });
      }
    }

    // 4. Créer la FriendRequest
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: targetUserId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      request: friendRequest,
    });
  } catch (error) {
    console.error("[API Friends Requests POST] Error:", error);

    return NextResponse.json(
      {
        error: "Error sending friend request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
