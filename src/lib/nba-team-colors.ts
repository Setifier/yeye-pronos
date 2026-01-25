/**
 * Couleurs officielles des équipes NBA
 *
 * Source: NBA Official Brand Guidelines
 * Format: { abbreviation: { primary: '#HEX', secondary: '#HEX' } }
 */

export const NBA_TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  // Eastern Conference
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" }, // Atlanta Hawks
  BOS: { primary: "#007A33", secondary: "#BA9653" }, // Boston Celtics
  BKN: { primary: "#000000", secondary: "#FFFFFF" }, // Brooklyn Nets
  CHA: { primary: "#1D1160", secondary: "#00788C" }, // Charlotte Hornets
  CHI: { primary: "#CE1141", secondary: "#000000" }, // Chicago Bulls
  CLE: { primary: "#860038", secondary: "#041E42" }, // Cleveland Cavaliers
  DET: { primary: "#C8102E", secondary: "#1D42BA" }, // Detroit Pistons
  IND: { primary: "#002D62", secondary: "#FDBB30" }, // Indiana Pacers
  MIA: { primary: "#98002E", secondary: "#F9A01B" }, // Miami Heat
  MIL: { primary: "#00471B", secondary: "#EEE1C6" }, // Milwaukee Bucks
  NYK: { primary: "#006BB6", secondary: "#F58426" }, // New York Knicks
  ORL: { primary: "#0077C0", secondary: "#C4CED4" }, // Orlando Magic
  PHI: { primary: "#006BB6", secondary: "#ED174C" }, // Philadelphia 76ers
  TOR: { primary: "#CE1141", secondary: "#000000" }, // Toronto Raptors
  WAS: { primary: "#002B5C", secondary: "#E31837" }, // Washington Wizards

  // Western Conference
  DAL: { primary: "#00538C", secondary: "#002B5E" }, // Dallas Mavericks
  DEN: { primary: "#0E2240", secondary: "#FEC524" }, // Denver Nuggets
  GSW: { primary: "#1D428A", secondary: "#FFC72C" }, // Golden State Warriors
  HOU: { primary: "#CE1141", secondary: "#000000" }, // Houston Rockets
  LAC: { primary: "#C8102E", secondary: "#1D428A" }, // LA Clippers
  LAL: { primary: "#552583", secondary: "#FDB927" }, // LA Lakers
  MEM: { primary: "#5D76A9", secondary: "#12173F" }, // Memphis Grizzlies
  MIN: { primary: "#0C2340", secondary: "#236192" }, // Minnesota Timberwolves
  NOP: { primary: "#0C2340", secondary: "#C8102E" }, // New Orleans Pelicans
  OKC: { primary: "#007AC1", secondary: "#EF3B24" }, // Oklahoma City Thunder
  PHX: { primary: "#1D1160", secondary: "#E56020" }, // Phoenix Suns
  POR: { primary: "#E03A3E", secondary: "#000000" }, // Portland Trail Blazers
  SAC: { primary: "#5A2D81", secondary: "#63727A" }, // Sacramento Kings
  SAS: { primary: "#C4CED4", secondary: "#000000" }, // San Antonio Spurs
  UTA: { primary: "#002B5C", secondary: "#00471B" }, // Utah Jazz
};

/**
 * Obtenir les couleurs d'une équipe par son abréviation
 */
export function getTeamColors(abbreviation: string): { primary: string; secondary: string } | null {
  return NBA_TEAM_COLORS[abbreviation] || null;
}

/**
 * Vérifier si une équipe a des couleurs définies
 */
export function hasTeamColors(abbreviation: string): boolean {
  return abbreviation in NBA_TEAM_COLORS;
}
