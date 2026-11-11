import { RankingBoard } from "@/components/ranking/ranking-board";

/**
 * Saison passée → Classement général (mêmes 5 classements que la saison en cours).
 * Saison vérifiée et fournie par layout.tsx.
 */
export default function ArchiveSeasonPage() {
  return <RankingBoard />;
}
