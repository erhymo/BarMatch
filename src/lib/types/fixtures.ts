export type LeagueKey = "NOR_ELITESERIEN" | "EPL" | "SERIE_A" | "UCL";

export type Fixture = {
  id: string;
  league: LeagueKey;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string; // ISO 8601 UTC
  round?: string;
  venue?: string;
};

