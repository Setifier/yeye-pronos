import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Pour les server actions de l'admin : refuse toute personne qui n'est pas administrateur. */
export async function assertAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Accès réservé aux administrateurs");
  }
  return session.user;
}
