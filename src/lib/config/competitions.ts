import type { LeagueKey } from '@/lib/types/fixtures';

/** Tier determines visual prominence for "big match" highlighting. */
export type CompetitionTier = 'top' | 'high' | 'standard';

export type Competition = {
  key: LeagueKey;
  label: string;
  apiFootballLeagueId?: number;
  defaultSeason?: number;
  type: 'league' | 'tournament';
  tier: CompetitionTier;
};

export const COMPETITIONS: Competition[] = [
  {
    key: 'NOR_ELITESERIEN',
    label: 'Eliteserien',
    type: 'league',
    tier: 'high',
    apiFootballLeagueId: 103,
    defaultSeason: 2026,
  },
  {
    key: 'NOR_1_DIVISION',
    label: 'OBOS-ligaen',
    type: 'league',
    tier: 'standard',
    apiFootballLeagueId: 104,
    defaultSeason: 2026,
  },
  {
    key: 'NOR_NM_CUPEN',
    label: 'NM Cupen',
    type: 'tournament',
    tier: 'high',
    apiFootballLeagueId: 105,
    defaultSeason: 2026,
  },
  {
    key: 'EPL',
    label: 'Premier League',
    type: 'league',
    tier: 'top',
    apiFootballLeagueId: 39,
    defaultSeason: 2025,
  },
  {
    key: 'ENG_CHAMPIONSHIP',
    label: 'Championship',
    type: 'league',
    tier: 'standard',
    apiFootballLeagueId: 40,
    defaultSeason: 2025,
  },
  {
    key: 'FA_CUP',
    label: 'FA Cup',
    type: 'tournament',
    tier: 'high',
    apiFootballLeagueId: 45,
    defaultSeason: 2025,
  },
  {
    key: 'EFL_TROPHY',
    label: 'EFL Trophy',
    type: 'tournament',
    tier: 'standard',
    apiFootballLeagueId: 46,
    defaultSeason: 2025,
  },
  {
    key: 'SERIE_A',
    label: 'Serie A',
    type: 'league',
    tier: 'high',
    apiFootballLeagueId: 135,
    defaultSeason: 2025,
  },
  {
    key: 'LA_LIGA',
    label: 'La Liga',
    type: 'league',
    tier: 'top',
    apiFootballLeagueId: 140,
    defaultSeason: 2025,
  },
  {
    key: 'COPA_DEL_REY',
    label: 'Copa del Rey',
    type: 'tournament',
    tier: 'standard',
    apiFootballLeagueId: 143,
    defaultSeason: 2025,
  },
  {
    key: 'BUNDESLIGA',
    label: 'Bundesliga',
    type: 'league',
    tier: 'high',
    apiFootballLeagueId: 78,
    defaultSeason: 2025,
  },
  {
    key: 'LIGUE_1',
    label: 'Ligue 1',
    type: 'league',
    tier: 'high',
    apiFootballLeagueId: 61,
    defaultSeason: 2025,
  },
  {
    key: 'UCL',
    label: 'UEFA Champions League',
    type: 'tournament',
    tier: 'top',
    apiFootballLeagueId: 2,
    defaultSeason: 2025,
  },
  {
    key: 'UEL',
    label: 'UEFA Europa League',
    type: 'tournament',
    tier: 'high',
    apiFootballLeagueId: 3,
    defaultSeason: 2025,
  },
  {
    key: 'FIFA_CWC',
    label: 'FIFA Club World Cup',
    type: 'tournament',
    tier: 'top',
    apiFootballLeagueId: 15,
    defaultSeason: 2025,
  },
  {
    key: 'FIFA_CWC_PLAYIN',
    label: 'FIFA Club World Cup - Play-In',
    type: 'tournament',
    tier: 'standard',
    apiFootballLeagueId: 7283,
    defaultSeason: 2025,
  },
  {
    key: 'UEFA_NL',
    label: 'UEFA Nations League',
    type: 'tournament',
    tier: 'high',
    apiFootballLeagueId: 6029,
    defaultSeason: 2024,
  },
  {
    key: 'WCQ_INTERCONTINENTAL_PLAYOFFS',
    label: 'Play-offs',
    type: 'tournament',
    tier: 'high',
    apiFootballLeagueId: 37,
    defaultSeason: 2026,
  },
  {
    key: 'FRIENDLIES',
    label: 'Friendlies',
    type: 'tournament',
    tier: 'standard',
    apiFootballLeagueId: 10,
    defaultSeason: 2026,
  },
];

/** All league keys derived from COMPETITIONS – single source of truth. */
export const ALL_LEAGUE_KEYS: LeagueKey[] = COMPETITIONS.map((c) => c.key);

export function getCompetitionByKey(key: LeagueKey): Competition {
  const competition = COMPETITIONS.find((c) => c.key === key);

  if (!competition) {
    throw new Error(`Unknown competition for leagueKey=${key}`);
  }

  return competition;
}

/** Returns true if the league is top or high tier ("storkamp"). */
export function isBigMatch(key: LeagueKey): boolean {
  const comp = getCompetitionByKey(key);
  return comp.tier === 'top' || comp.tier === 'high';
}

/** Returns true if the league is top tier. */
export function isTopTier(key: LeagueKey): boolean {
  return getCompetitionByKey(key).tier === 'top';
}

