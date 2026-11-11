import { requireAuth } from "@/lib/auth-helpers";
import { PlayerPronosView } from "@/components/players/player-pronos-view";

/** Saison passée → Mes pronos, nuit par nuit, avec les bonus. */
export default async function ArchiveMyPronosPage({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  const session = await requireAuth(`/archives/${season}/pronos`);
  return <PlayerPronosView playerId={session.user.id} />;
}
