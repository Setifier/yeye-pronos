/**
 * Mapping des abréviations NBA vers les fichiers de logos locaux
 * Les logos sont dans: public/assets/teams_logo/
 * Accessibles via: /assets/teams_logo/{filename}.png
 */
export const NBA_TEAM_LOGOS: Record<string, string> = {
  // Eastern Conference
  ATL: "hawks.png",
  BOS: "celtics.png",
  BKN: "nets.png",
  CHA: "hornets.png",
  CHI: "bulls.png",
  CLE: "cavaliers.png",
  DET: "pistons.png",
  IND: "pacers.png",
  MIA: "heat.png",
  MIL: "bucks.png",
  NYK: "knicks.png",
  ORL: "magic.png",
  PHI: "76ers.png",
  TOR: "raptors.png",
  WAS: "wizards.png",

  // Western Conference
  DAL: "mavericks.png",
  DEN: "nuggets.png",
  GSW: "warriors.png",
  HOU: "rockets.png",
  LAC: "clippers.png",
  LAL: "lakers.png",
  MEM: "grizzlies.png",
  MIN: "timberwolves.png",
  NOP: "pelicans.png",
  OKC: "thunder.png",
  PHX: "suns.png",
  POR: "blazers.png",
  SAC: "kings.png",
  SAS: "spurs.png",
  UTA: "jazz.png",
};

/**
 * Obtient l'URL complète du logo d'une équipe
 * @deprecated Use getTeamLogo instead
 */
export function getTeamLogoUrl(abbreviation: string): string {
  const filename = NBA_TEAM_LOGOS[abbreviation];
  if (!filename) {
    console.warn(`Logo non trouvé pour l'équipe: ${abbreviation}`);
    return "/assets/teams_logo/default.png"; // Fallback
  }
  return `/assets/teams_logo/${filename}`;
}

/**
 * Obtient l'URL complète du logo d'une équipe (alias pour compatibility)
 */
export function getTeamLogo(abbreviation: string): string {
  return getTeamLogoUrl(abbreviation);
}
