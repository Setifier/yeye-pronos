import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Friends: Récupérer la liste des amis
 * GET /api/friends
 *
 * Retourne tous les amis acceptés (FriendRequest avec status = "ACCEPTED")
 * où l'utilisateur est soit sender soit receiver
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

    // Récupérer toutes les FriendRequest acceptées
    const friendships = await prisma.friendRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
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
        receiver: {
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

    // Mapper pour retourner l'ami (pas soi-même)
    const friends = friendships.map((fr) =>
      fr.senderId === userId ? fr.receiver : fr.sender
    );

    return NextResponse.json({
      success: true,
      friends,
    });
  } catch (error) {
    console.error("[API Friends] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching friends",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
