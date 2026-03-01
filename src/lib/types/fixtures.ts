export type LeagueKey = "NOR_ELITESERIEN" | "NOR_1_DIVISION" | "EPL" | "ENG_CHAMPIONSHIP" | "FA_CUP" | "EFL_TROPHY" | "SERIE_A" | "LA_LIGA" | "COPA_DEL_REY" | "BUNDESLIGA" | "LIGUE_1" | "UCL" | "UEL" | "FIFA_CWC" | "FIFA_CWC_PLAYIN" | "UEFA_NL" | "FRIENDLIES";

export type Fixture = {
  id: string;
  league: LeagueKey;
  homeTeam: string;
  awayTeam: string;
  /**
   * Optional URL-er til laglogoer fra fixture-leverandøren.
   * Vises i kamp-oversikter hvis tilgjengelig.
   */
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
  kickoffUtc: string; // ISO 8601 UTC
  round?: string;
  venue?: string;
};

