import { notFound, redirect } from "next/navigation";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { getCurrentSeason } from "@/types/season";

/** Archives : les classements des pronos d'une saison terminée (mêmes 5 classements que la saison en cours). */
export default async function ArchiveSeasonPage({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  if (!/^\d{4}-\d{2}$/.test(season)) notFound();
  if (season === getCurrentSeason()) redirect("/classement");
  return <RankingBoard season={season} />;
}
