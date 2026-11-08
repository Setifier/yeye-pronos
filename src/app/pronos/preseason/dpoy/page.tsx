"use client";

import { AwardPick } from "@/components/preseason/award-pick";

export default function PreseasonDpoyPage() {
  return (
    <AwardPick
      type="PRESEASON_DPOY"
      title="Défenseur de l'année"
      subtitle="Choisis le meilleur défenseur de la saison (DPOY). Plus ton choix est inattendu, plus il rapporte."
      pickedLabel="Ton défenseur de l'année"
      listHint="Les favoris en premier. Tu peux chercher n'importe quel joueur sous contrat."
    />
  );
}
