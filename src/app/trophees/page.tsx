import { prisma } from "@/lib/prisma";
import { getSeasonNbaAwards } from "@/lib/nba-awards";
import { StatsNavbar } from "@/components/layout/stats-navbar";
import { NbaAwardsView } from "@/components/awards/nba-awards-view";
import { getCurrentSeason } from "@/types/season";

export const dynamic = "force-dynamic";

/** Trophées NBA de la saison en cours (MVP, All-NBA, NBA Cup…), remplis au fil des annonces par le CRON de midi. */
export default async function TropheesPage() {
  const season = getCurrentSeason();
  const winners = await getSeasonNbaAwards(prisma, season);
  return (
    <>
      <StatsNavbar />
      <NbaAwardsView season={season} winners={winners} current />
    </>
  );
}
