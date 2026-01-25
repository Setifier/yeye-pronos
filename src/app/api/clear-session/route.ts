import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();

  // Supprimer tous les cookies
  cookieStore.getAll().forEach((cookie) => {
    cookieStore.delete(cookie.name);
  });

  return NextResponse.json({
    message: "Cookies supprimés. Vous pouvez maintenant vous reconnecter.",
    redirect: "/auth/login"
  });
}
