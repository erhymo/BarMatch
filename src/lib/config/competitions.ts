import type { LeagueKey } from '@/lib/types/fixtures';

export type Competition = {
  key: LeagueKey;
  label: string;
  apiFootballLeagueId?: number;
  defaultSeason?: number;
  type: 'league' | 'tournament';
};

export const COMPETITIONS: Competition[] = [
  {
    key: 'NOR_ELITESERIEN',
    label: 'Eliteserien',
    type: 'league',
    apiFootballLeagueId: 103,
    defaultSeason: 2026,
  },
  {
    key: 'EPL',
    label: 'Premier League',
    type: 'league',
    apiFootballLeagueId: 39,
    defaultSeason: 2025,
  },
  {
    key: 'SERIE_A',
    label: 'Serie A',
    type: 'league',
    apiFootballLeagueId: 135,
    defaultSeason: 2025,
  },
  {
    key: 'UCL',
    label: 'UEFA Champions League',
    type: 'tournament',
    apiFootballLeagueId: 2,
    defaultSeason: 2025,
  },
];

export function getCompetitionByKey(key: LeagueKey): Competition {
  const competition = COMPETITIONS.find((c) => c.key === key);

  if (!competition) {
    throw new Error(`Unknown competition for leagueKey=${key}`);
  }

  return competition;
}

