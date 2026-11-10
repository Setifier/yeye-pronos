import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicProfile } from "@/lib/public-profile";

/**
 * Fiche publique d'un joueur : profil, stats de la saison, rang, derniers pronos terminés
 * (jamais un prono en cours), lien d'amitié avec celui qui regarde.
 * GET /api/users/[id]/public-profile — connexion requise.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const profile = await getPublicProfile(prisma, id, session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("[API Users Public Profile] Error:", error);
    return NextResponse.json({ error: "Error fetching public profile" }, { status: 500 });
  }
}
