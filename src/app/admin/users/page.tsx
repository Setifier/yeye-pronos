import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayersOverview } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import { PlayersPanel } from "@/components/admin/players-panel";

export const metadata: Metadata = { title: "Admin · Joueurs" };

export default async function AdminPlayersPage() {
  const [session, data] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPlayersOverview(prisma),
  ]);

  return (
    <div>
      <PageHeader
        title="Joueurs"
        description={`Saison ${data.season} · inscriptions, pronos, paris de saison et activité`}
      />
      <PlayersPanel data={data} currentUserId={session?.user.id ?? ""} />
    </div>
  );
}
