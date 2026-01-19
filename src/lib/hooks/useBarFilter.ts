import { useMemo } from 'react';
import { Bar } from '../models';
import { BarService } from '../services';

/**
 * React hook for filtering bars
 * Wraps BarService filtering logic with React memoization
 */
export function useBarFilter(bars: Bar[], selectedTeamId: string | null) {
  const filteredBars = useMemo(() => {
    return BarService.filterBarsByTeam(bars, selectedTeamId);
  }, [bars, selectedTeamId]);

  return filteredBars;
}

