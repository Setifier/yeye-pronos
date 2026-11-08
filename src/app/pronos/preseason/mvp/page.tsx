"use client";

import { AwardPick } from "@/components/preseason/award-pick";

export default function PreseasonMvpPage() {
  return (
    <AwardPick
      type="PRESEASON_MVP_SEASON"
      title="MVP de la saison"
      subtitle="Choisis le MVP de la saison régulière. Plus ton choix est inattendu, plus il rapporte."
      pickedLabel="Ton MVP"
      listHint="Les favoris en premier. Tu peux chercher n'importe quel joueur sous contrat."
    />
  );
}
