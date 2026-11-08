"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { PREDICTION_SAVED_EVENT } from "@/components/bets/hooks";

/**
 * Chiffres de l'interface mobile (barre du haut + barre d'onglets) : points, rang, paris ouverts de la nuit.
 * Un seul état partagé, chargé depuis /api/me/hud, et seulement sur petit écran (rien sur ordinateur).
 */

export interface Hud {
  points: number;
  rank: number | null;
  totalPlayers: number;
  /** Matchs de la nuit en cours encore ouverts et sans prono. */
  missing: number;
  /** Matchs de la nuit en cours encore ouverts. */
  open: number;
  nextDeadline: string | null;
}

export const MOBILE_QUERY = "(max-width: 767px)";

let state: Hud | null = null;
let lastFetch = 0;
let inflight = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Recharge les chiffres (au plus toutes les 30 s, sauf `force`). */
export function refreshHud(force = false) {
  if (typeof window === "undefined" || inflight) return;
  if (!window.matchMedia(MOBILE_QUERY).matches) return;
  if (!force && Date.now() - lastFetch < 30_000) return;
  inflight = true;
  lastFetch = Date.now();
  fetch("/api/me/hud")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && typeof d.points === "number") {
        state = d as Hud;
        listeners.forEach((l) => l());
      }
    })
    .catch(() => {})
    .finally(() => { inflight = false; });
}

export function useHud(): Hud | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

/** À monter une seule fois : recharge à la navigation, au retour sur l'onglet et après chaque prono. */
export function useHudSync() {
  const pathname = usePathname();

  useEffect(() => { refreshHud(); }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onSaved = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refreshHud(true), 1200);
    };
    const onVisible = () => { if (document.visibilityState === "visible") refreshHud(); };
    window.addEventListener(PREDICTION_SAVED_EVENT, onSaved);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(PREDICTION_SAVED_EVENT, onSaved);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
