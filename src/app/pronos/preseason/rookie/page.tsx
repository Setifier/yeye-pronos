"use client";

import { AwardPick } from "@/components/preseason/award-pick";

export default function PreseasonRookiePage() {
  return (
    <AwardPick
      type="PRESEASON_ROOKIE"
      title="Rookie de l'année"
      subtitle="Choisis le meilleur rookie de la saison. Plus il a été drafté tard, plus il rapporte."
      pickedLabel="Ton rookie de l'année"
      listHint="Les joueurs de la dernière draft, dans l'ordre de la draft."
      emptyHint="La liste des rookies n'est pas encore disponible."
    />
  );
}
