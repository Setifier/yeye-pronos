// Mapping des abréviations d'équipes NBA vers leurs timezones
export const NBA_TEAM_TIMEZONES: Record<string, string> = {
  // Eastern Time (ET) - UTC-5
  BOS: "America/New_York", // Boston
  BKN: "America/New_York", // Brooklyn
  NYK: "America/New_York", // New York
  PHI: "America/New_York", // Philadelphia
  TOR: "America/Toronto", // Toronto
  CHI: "America/Chicago", // Chicago (CT mais affichons ET pour cohérence NBA)
  CLE: "America/New_York", // Cleveland
  DET: "America/Detroit", // Detroit
  IND: "America/Indiana/Indianapolis", // Indianapolis
  MIL: "America/Chicago", // Milwaukee
  ATL: "America/New_York", // Atlanta
  CHA: "America/New_York", // Charlotte
  MIA: "America/New_York", // Miami
  ORL: "America/New_York", // Orlando
  WAS: "America/New_York", // Washington

  // Central Time (CT) - UTC-6
  DAL: "America/Chicago", // Dallas
  HOU: "America/Chicago", // Houston
  MEM: "America/Chicago", // Memphis
  NOP: "America/Chicago", // New Orleans
  SAS: "America/Chicago", // San Antonio
  MIN: "America/Chicago", // Minneapolis

  // Mountain Time (MT) - UTC-7
  DEN: "America/Denver", // Denver
  UTA: "America/Denver", // Salt Lake City

  // Pacific Time (PT) - UTC-8
  GSW: "America/Los_Angeles", // Golden State
  LAC: "America/Los_Angeles", // LA Clippers
  LAL: "America/Los_Angeles", // LA Lakers
  PHX: "America/Phoenix", // Phoenix
  SAC: "America/Los_Angeles", // Sacramento
  POR: "America/Los_Angeles", // Portland
  OKC: "America/Chicago", // Oklahoma City
};

// Fonction helper pour obtenir la timezone d'une équipe
export function getTeamTimezone(abbreviation: string): string {
  return (
    NBA_TEAM_TIMEZONES[abbreviation.toUpperCase()] || "America/New_York"
  );
}

// Obtenir le nom de la timezone en format court
export function getTimezoneAbbreviation(timezone: string): string {
  const abbrevMap: Record<string, string> = {
    "America/New_York": "ET",
    "America/Toronto": "ET",
    "America/Detroit": "ET",
    "America/Indiana/Indianapolis": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Phoenix": "MT",
    "America/Los_Angeles": "PT",
  };

  return abbrevMap[timezone] || "ET";
}
