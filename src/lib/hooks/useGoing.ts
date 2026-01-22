import { useCallback, useEffect, useState } from 'react';
import { GoingStatus, GoingVote } from '../types/going';
import { GoingService } from '../services';

/**
 * React hook for managing "Skal" / going votes
 * Wraps GoingService with React state management
 */
export function useGoing() {
  const [votes, setVotes] = useState<GoingVote[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load votes and userId from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadedVotes = GoingService.loadVotes(localStorage);
    setVotes(loadedVotes);

    const existingUserId = localStorage.getItem('barmatch_user_id');
    if (existingUserId) {
      setUserId(existingUserId);
    } else {
      const newUserId = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem('barmatch_user_id', newUserId);
      setUserId(newUserId);
    }

    setIsInitialized(true);
  }, []);

  // Save votes to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    GoingService.saveVotes(votes, localStorage);
  }, [votes, isInitialized]);

  const getGoingStatusForMatch = useCallback(
    (barId: string, matchId: string): GoingStatus => {
      return GoingService.getStatusForMatch(userId, barId, matchId, votes);
    },
    [userId, votes],
  );

  const getGoingForBar = useCallback(
    (barId: string): GoingStatus[] => {
      return GoingService.getStatusForBar(userId, barId, votes);
    },
    [userId, votes],
  );

  const toggleGoing = useCallback(
    (barId: string, matchId: string) => {
      if (!userId) return;
      setVotes((prev) => GoingService.toggleVote(userId, barId, matchId, prev));
    },
    [userId],
  );

  return {
    votes,
    userId,
    getGoingStatusForMatch,
    getGoingForBar,
    toggleGoing,
  };
}

