import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prepareInvitationEmail } from "@/lib/emails/invitation-email";

export const dynamic = "force-dynamic";

/** GET /api/admin/invitation-preview — l'e-mail d'invitation tel qu'il partira (admin uniquement). */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Accès réservé aux administrateurs", { status: 403 });
  }
  const email = await prepareInvitationEmail(prisma, session.user.name ?? null);
  return new NextResponse(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
