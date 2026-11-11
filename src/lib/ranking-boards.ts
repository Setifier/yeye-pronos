/**
 * Les classements des pronos d'une saison (client et serveur, sans base de données) :
 * Points · Réussite · Bons écarts · Meilleur marqueur · Combo ultime.
 * Les données viennent de GET /api/classement?season=… ; le tri se fait ici, d'un onglet à l'autre sans recharger.
 */

export type BoardKey = "points" | "reussite" | "ecarts" | "marqueur" | "combo";

export interface BoardPlayer {
  id: string;
  name: string;
  image: string | null;
  isCurrentUser: boolean;
  points: number;
  matchPoints: number;
  specialPoints: number;
  won: number;
  lost: number;
  /** % de bons vainqueurs sur les pronos terminés */
  winRate: number;
  marginHits: number;
  marginPoints: number;
  scorerHits: number;
  scorerPoints: number;
  comboHits: number;
  comboPoints: number;
}

/** Classement Réussite : il faut assez de pronos terminés (1 sur 1 = 100 % ne vaut pas 40 sur 60). */
export const MIN_FINISHED_FOR_RATE = 10;

export const BOARDS: { key: BoardKey; label: string; hint: string }[] = [
  { key: "points",   label: "Points",           hint: "Touche un joueur pour voir d'où viennent ses points" },
  { key: "reussite", label: "Réussite",         hint: `Part de bons vainqueurs · ${MIN_FINISHED_FOR_RATE} pronos terminés minimum` },
  { key: "ecarts",   label: "Bons écarts",      hint: "Nombre de bons écarts trouvés" },
  { key: "marqueur", label: "Meilleur marqueur", hint: "Nombre de meilleurs marqueurs trouvés" },
  { key: "combo",    label: "Combo ultime",     hint: "Vainqueur + écart + meilleur marqueur dans le même match" },
];

export interface BoardRow {
  /** null = pas classé sur ce tableau (Réussite : pas assez de pronos terminés) */
  rank: number | null;
  player: BoardPlayer;
  /** Valeur principale affichée (« 1 240 », « 68 % », « 12 ») */
  value: string;
  unit: string;
  /** Détail sous la valeur (« 34/50 », « +120 pts ») */
  sub: string | null;
  /** Rien sur ce tableau (0 bon écart…) : ligne atténuée */
  empty: boolean;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Valeur principale puis départage, du plus fort au plus faible. */
function score(p: BoardPlayer, key: BoardKey): [number, number] {
  switch (key) {
    case "points":   return [p.points, p.winRate];
    case "reussite": return [p.winRate, p.won];
    case "ecarts":   return [p.marginHits, p.marginPoints];
    case "marqueur": return [p.scorerHits, p.scorerPoints];
    case "combo":    return [p.comboHits, p.comboPoints];
  }
}

function display(p: BoardPlayer, key: BoardKey): Pick<BoardRow, "value" | "unit" | "sub"> {
  switch (key) {
    case "points":
      // Le détail (vainqueurs, écarts, marqueurs, combos, paris de saison) s'affiche au toucher de la ligne
      return { value: fmt(p.points), unit: "pts", sub: null };
    case "reussite":
      return { value: `${p.winRate}`, unit: "%", sub: `${p.won}/${p.won + p.lost}` };
    case "ecarts":
      return { value: `${p.marginHits}`, unit: p.marginHits > 1 ? "écarts" : "écart", sub: p.marginPoints ? `+${fmt(p.marginPoints)} pts` : null };
    case "marqueur":
      return { value: `${p.scorerHits}`, unit: "trouvé" + (p.scorerHits > 1 ? "s" : ""), sub: p.scorerPoints ? `+${fmt(p.scorerPoints)} pts` : null };
    case "combo":
      return { value: `${p.comboHits}`, unit: "combo" + (p.comboHits > 1 ? "s" : ""), sub: p.comboPoints ? `+${fmt(p.comboPoints)} pts` : null };
  }
}

export function buildBoard(players: BoardPlayer[], key: BoardKey): BoardRow[] {
  const qualifies = (p: BoardPlayer) => key !== "reussite" || p.won + p.lost >= MIN_FINISHED_FOR_RATE;
  const ranked = players.filter(qualifies);
  const others = players.filter((p) => !qualifies(p));

  ranked.sort((a, b) => {
    const [a1, a2] = score(a, key);
    const [b1, b2] = score(b, key);
    return b1 - a1 || b2 - a2 || a.name.localeCompare(b.name);
  });

  // Ex æquo (même valeur et même départage) : même rang, « 1, 2, 2, 4 »
  let prev: [number, number] | null = null;
  let prevRank = 0;
  const rows: BoardRow[] = ranked.map((p, i) => {
    const s = score(p, key);
    const rank = prev && prev[0] === s[0] && prev[1] === s[1] ? prevRank : i + 1;
    prev = s;
    prevRank = rank;
    return { rank, player: p, ...display(p, key), empty: key !== "points" && key !== "reussite" && s[0] === 0 };
  });

  // Réussite : les autres à la suite, sans rang, avec ce qu'il leur manque
  others
    .sort((a, b) => b.won + b.lost - (a.won + a.lost) || a.name.localeCompare(b.name))
    .forEach((p) => {
      const finished = p.won + p.lost;
      rows.push({
        rank: null,
        player: p,
        value: "–",
        unit: "",
        sub: `${finished}/${MIN_FINISHED_FOR_RATE} pronos terminés`,
        empty: true,
      });
    });

  return rows;
}
