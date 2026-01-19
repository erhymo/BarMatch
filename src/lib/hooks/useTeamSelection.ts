import { useMemo } from 'react';
import { Match, Team } from '../models';
import { MatchService } from '../services';

/**
 * React hook for team selection logic
 * Wraps MatchService team extraction and sorting with React memoization
 */
export function useTeamSelection(
  matches: Match[],
  selectedLeague: string,
  favoriteTeamIds: string[]
) {
  const teams = useMemo(() => {
    if (!selectedLeague) return [];

    const teamsForLeague = MatchService.getTeamsForLeague(matches, selectedLeague);
    return MatchService.sortTeams(teamsForLeague, favoriteTeamIds);
  }, [matches, selectedLeague, favoriteTeamIds]);

  return teams;
}

/**
 * React hook for league extraction
 */
export function useLeagues(matches: Match[]) {
  const leagues = useMemo(() => {
    return MatchService.getUniqueLeagues(matches);
  }, [matches]);

  return leagues;
}

