"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PreseasonBetType, StandingsPredictionData } from "@/types/special-predictions";

export interface PreseasonTeam {
  id: string;
  abbreviation: string;
  name: string;
  city: string;
  conference: "EAST" | "WEST";
  division: string;
  previousRecord: string | null;
  previousRank: number | null;
  nbaCupGroup: string | null;
  nbaCupPoints: number | null;
}

export interface PreseasonPlayer {
  id: string;
  fullName: string;
  headshot: string | null;
  position: string | null;
  teamId: string | null;
  ppg: number | null;
  games: number;
  previousPpg: number | null;
}

export interface SavedPrediction {
  data: unknown;
  status: string;
  pointsEarned: number;
  updatedAt: string;
}

export interface PreseasonData {
  season: string;
  previousSeason: string;
  deadline: string;
  open: boolean;
  teams: PreseasonTeam[];
  mvpPoints: number;
  defaults: { standings: StandingsPredictionData };
  predictions: Record<PreseasonBetType, SavedPrediction | null>;
  players?: PreseasonPlayer[];
}

/** Chargement + enregistrement des paris de début de saison. */
export function usePreseason(options: { players?: boolean } = {}) {
  const [data, setData] = useState<PreseasonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch(`/api/special-predictions${options.players ? "?include=players" : ""}`)
      .then(async (r) => {
        if (r.status === 401) { window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`; return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => setError("Impossible de charger les paris de début de saison."));
  }, [options.players]);

  const open = !!data && now < new Date(data.deadline).getTime();

  const save = useCallback(async (type: PreseasonBetType, payload: unknown, successMessage = "Pari enregistré") => {
    setSaving(true);
    try {
      const res = await fetch("/api/special-predictions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data: payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Enregistrement impossible");
      setData((prev) => prev && ({ ...prev, predictions: { ...prev.predictions, [type]: json.prediction } }));
      toast.success(successMessage, { duration: 2000 });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, error, open, now, saving, save };
}
