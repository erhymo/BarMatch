export type LeagueKey = "NOR_ELITESERIEN" | "EPL" | "ENG_CHAMPIONSHIP" | "FA_CUP" | "SERIE_A" | "UCL" | "UEL";

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

