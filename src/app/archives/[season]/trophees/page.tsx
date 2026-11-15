import { prisma } from "@/lib/prisma";
import { getSeasonNbaAwards } from "@/lib/nba-awards";
import { NbaAwardsView } from "@/components/awards/nba-awards-view";

export const dynamic = "force-dynamic";

/** Saison passée → Trophées NBA (remplis par `npm run db:sync-awards -- --season=…`). Saison vérifiée par layout.tsx. */
export default async function ArchiveTropheesPage({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  const winners = await getSeasonNbaAwards(prisma, season);
  return <NbaAwardsView season={season} winners={winners} current={false} />;
}
