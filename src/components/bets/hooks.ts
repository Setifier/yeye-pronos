"use client";

import { useCallback, useEffect, useState } from "react";
import type { BetPrediction } from "@/types/bet";

/** Heure courante rafraîchie régulièrement (comptes à rebours, fermeture des paris). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const NO_SPOIL_KEY = "noSpoilEnabled";

/** Préférence "No Spoil" partagée par toutes les pages (localStorage, activée par défaut). */
export function useNoSpoil(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NO_SPOIL_KEY);
      if (saved !== null) setEnabled(saved === "true");
    } catch { /* stockage indisponible */ }
  }, []);
  const update = useCallback((v: boolean) => {
    setEnabled(v);
    try { localStorage.setItem(NO_SPOIL_KEY, String(v)); } catch { /* ignore */ }
  }, []);
  return [enabled, update];
}

export interface SavePredictionInput {
  gameId: string;
  predictedTeamId: string;
  /** absent = inchangé, null = retiré */
  predictedScoreMargin?: string | null;
  /** absent = inchangé, null = retiré */
  predictedTopScorerId?: string | null;
}

/** Enregistre un prono et renvoie la version serveur. Lève une erreur lisible sinon. */
export async function savePrediction(input: SavePredictionInput): Promise<BetPrediction> {
  const res = await fetch("/api/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Impossible d'enregistrer le prono");
  const p = data.prediction;
  return {
    predictedTeamId:      p.predictedTeamId,
    predictedScoreMargin: p.predictedScoreMargin ?? null,
    predictedTopScorer:   p.predictedTopScorer
      ? { id: p.predictedTopScorer.id, fullName: p.predictedTopScorer.fullName, headshot: p.predictedTopScorer.headshot ?? null }
      : null,
    result:               p.result ?? "PENDING",
    pointsEarned:         p.pointsEarned ?? 0,
    marginBonusPoints:    0,
    topScorerBonusPoints: 0,
    comboBonusPoints:     0,
  };
}

/** Annule un prono (avant la clôture). */
export async function deletePrediction(gameId: string): Promise<void> {
  const res = await fetch(`/api/predictions?gameId=${gameId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Impossible d'annuler le prono");
  }
}
