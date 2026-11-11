import { PlayerPronosView } from "@/components/players/player-pronos-view";

/** Pronos terminés d'un joueur (saison en cours), nuit par nuit, à côté des miens. */
export default async function JoueurPronosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayerPronosView playerId={id} />;
}
