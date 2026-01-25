import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Friends Sent Requests: Récupérer les demandes d'amis envoyées
 * GET /api/friends/requests/sent
 *
 * Retourne toutes les demandes d'amis envoyées par l'utilisateur connecté
 * avec le statut PENDING
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

    // Récupérer toutes les demandes envoyées avec statut PENDING
    const sentRequests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "PENDING",
      },
      include: {
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

    return NextResponse.json({
      success: true,
      requests: sentRequests,
    });
  } catch (error) {
    console.error("[API Friends Sent Requests] Error:", error);

    return NextResponse.json(
      {
        error: "Error fetching sent friend requests",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
