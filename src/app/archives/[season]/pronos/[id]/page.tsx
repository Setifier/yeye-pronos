import { requireAuth } from "@/lib/auth-helpers";
import { PlayerPronosView } from "@/components/players/player-pronos-view";

/** Saison passée → les pronos d'un joueur (depuis le classement général de cette saison), à côté des miens. */
export default async function ArchivePlayerPronosPage({ params }: { params: Promise<{ season: string; id: string }> }) {
  const { season, id } = await params;
  await requireAuth(`/archives/${season}/pronos/${id}`);
  return <PlayerPronosView playerId={id} />;
}
