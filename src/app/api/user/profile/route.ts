import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        image: true,
        favoriteTeamId: true,
        favoritePlayerId: true,
        favoriteTeam: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
            logoUrl: true,
          },
        },
        favoritePlayer: {
          select: {
            id: true,
            fullName: true,
            position: true,
            headshot: true,
            team: {
              select: {
                abbreviation: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, favoriteTeamId, favoritePlayerId } = body;

    // Build update data object
    const updateData: any = {};

    // Validate and add name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Le nom est requis" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Add favoriteTeamId if provided (can be null to clear)
    if (favoriteTeamId !== undefined) {
      if (favoriteTeamId === null || favoriteTeamId === "") {
        updateData.favoriteTeamId = null;
      } else {
        // Verify team exists
        const teamExists = await prisma.team.findUnique({
          where: { id: favoriteTeamId },
        });
        if (!teamExists) {
          return NextResponse.json(
            { error: "Équipe introuvable" },
            { status: 404 }
          );
        }
        updateData.favoriteTeamId = favoriteTeamId;
      }
    }

    // Add favoritePlayerId if provided (can be null to clear)
    if (favoritePlayerId !== undefined) {
      if (favoritePlayerId === null || favoritePlayerId === "") {
        updateData.favoritePlayerId = null;
      } else {
        // Verify player exists
        const playerExists = await prisma.player.findUnique({
          where: { id: favoritePlayerId },
        });
        if (!playerExists) {
          return NextResponse.json(
            { error: "Joueur introuvable" },
            { status: 404 }
          );
        }
        updateData.favoritePlayerId = favoritePlayerId;
      }
    }

    // Update user if there's data to update
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/parametres");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
