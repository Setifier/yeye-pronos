import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API Friends Requests: Refuser une demande d'ami
 * POST /api/friends/requests/[id]/reject
 *
 * Protégé: Authentification requise + doit être le receiver
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const requestId = params.id;

    // 1. Vérifier que la demande existe
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!friendRequest) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }

    // 2. Vérifier qu'on est bien le receiver
    if (friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - You are not the receiver of this request" },
        { status: 403 }
      );
    }

    // 3. Vérifier que le statut est PENDING
    if (friendRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Request already ${friendRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // 4. Mettre à jour le status à REJECTED
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: "Friend request rejected",
    });
  } catch (error) {
    console.error("[API Friends Requests Reject] Error:", error);

    return NextResponse.json(
      {
        error: "Error rejecting friend request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
