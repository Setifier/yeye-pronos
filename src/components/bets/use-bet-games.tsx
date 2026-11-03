"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { BetGame, BetPrediction } from "@/types/bet";
import { savePrediction } from "./hooks";
import { BetSheet } from "./bet-sheet";
import { BoxscoreModal } from "@/components/matchs/boxscore-modal";

interface SheetState {
  games: BetGame[];   // file figée à l'ouverture (ne bouge pas pendant qu'on parie)
  startIndex: number;
  title?: string;
}

/**
 * État partagé d'une liste de matchs pariables : choix rapide d'équipe,
 * fenêtre de pari (un match ou une file), box score.
 */
export function useBetGames(noSpoil: boolean) {
  const [games, setGames] = useState<BetGame[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [boxscoreId, setBoxscoreId] = useState<string | null>(null);

  const setPrediction = useCallback((gameId: string, prediction: BetPrediction | null) => {
    setGames((list) => list.map((g) => (g.id === gameId ? { ...g, prediction } : g)));
  }, []);

  /** Un clic sur une équipe = prono enregistré (les bonus déjà choisis sont conservés). */
  const quickPick = useCallback(async (game: BetGame, teamId: string) => {
    if (game.prediction?.predictedTeamId === teamId) {
      // Déjà choisie : on ouvre la fenêtre pour ajouter/modifier les bonus
      setSheet({ games: [game], startIndex: 0 });
      return;
    }
    const before = game.prediction;
    setPrediction(game.id, {
      ...(before ?? {
        predictedScoreMargin: null, predictedTopScorer: null, result: "PENDING",
        pointsEarned: 0, marginBonusPoints: 0, topScorerBonusPoints: 0, comboBonusPoints: 0,
      }),
      predictedTeamId: teamId,
    });
    setSavingId(game.id);
    try {
      setPrediction(game.id, await savePrediction({ gameId: game.id, predictedTeamId: teamId }));
      const team = teamId === game.homeTeam.id ? game.homeTeam : game.awayTeam;
      toast.success(before ? `Changé : ${team.name}` : `Prono enregistré : ${team.name}`, { duration: 1800 });
    } catch (err) {
      setPrediction(game.id, before);
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSavingId(null);
    }
  }, [setPrediction]);

  const openSheet = useCallback((list: BetGame[], startIndex = 0, title?: string) => {
    if (list.length === 0) return;
    setSheet({ games: list, startIndex, title });
  }, []);

  const overlays = (
    <>
      {sheet && (
        <BetSheet
          games={sheet.games}
          startIndex={sheet.startIndex}
          title={sheet.title}
          onClose={() => setSheet(null)}
          onPredictionChange={setPrediction}
        />
      )}
      {boxscoreId && (
        <BoxscoreModal isOpen onClose={() => setBoxscoreId(null)} gameId={boxscoreId} noSpoilEnabled={noSpoil} />
      )}
    </>
  );

  return {
    games,
    setGames,
    savingId,
    quickPick,
    openSheet,
    openGame: (game: BetGame) => openSheet([game], 0),
    showBoxscore: (game: BetGame) => setBoxscoreId(game.id),
    overlays,
  };
}
