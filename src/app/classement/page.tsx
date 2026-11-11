import { RankingBoard } from "@/components/ranking/ranking-board";

/**
 * Classement de la saison en cours : Points · Réussite · Bons écarts · Meilleur marqueur · Combo ultime.
 * Les saisons passées sont dans les Archives (/archives/[saison]).
 */
export default function ClassementPage() {
  return <RankingBoard />;
}
