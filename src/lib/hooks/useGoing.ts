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

    const existingUserId = localStorage.getItem('barmatch_user_id');
    if (existingUserId) {
      setUserId(existingUserId);
    } else {
      const newUserId = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem('barmatch_user_id', newUserId);
      setUserId(newUserId);
    }

    // Optional dev/demo seed: pre-populate some "Skal" votes so counts > 0 on selected matches
    const isDemoSeedEnabled = process.env.NEXT_PUBLIC_GOING_DEMO_SEED === 'true';
    const hasSeededDemo = localStorage.getItem('barmatch_going_demo_seeded_v1') === 'true';

    if (isDemoSeedEnabled && !hasSeededDemo) {
      const demoVotes: GoingVote[] = [
        // Oslo Mekaniske Verksted (barId: '1')
        { barId: '1', matchId: '1', userId: 'demo-user-1', timestamp: new Date().toISOString() },
        { barId: '1', matchId: '1', userId: 'demo-user-2', timestamp: new Date().toISOString() },
        { barId: '1', matchId: '1', userId: 'demo-user-3', timestamp: new Date().toISOString() },

        // Territoriet (barId: '5')
        { barId: '5', matchId: '2', userId: 'demo-user-4', timestamp: new Date().toISOString() },
        { barId: '5', matchId: '2', userId: 'demo-user-5', timestamp: new Date().toISOString() },
        { barId: '5', matchId: '2', userId: 'demo-user-6', timestamp: new Date().toISOString() },
        { barId: '5', matchId: '2', userId: 'demo-user-7', timestamp: new Date().toISOString() },
        { barId: '5', matchId: '2', userId: 'demo-user-8', timestamp: new Date().toISOString() },

        // Fotballpuben Bryggen (barId: '13')
        { barId: '13', matchId: '15', userId: 'demo-user-9', timestamp: new Date().toISOString() },
        { barId: '13', matchId: '15', userId: 'demo-user-10', timestamp: new Date().toISOString() },
        { barId: '13', matchId: '15', userId: 'demo-user-11', timestamp: new Date().toISOString() },
        { barId: '13', matchId: '15', userId: 'demo-user-12', timestamp: new Date().toISOString() },
        { barId: '13', matchId: '15', userId: 'demo-user-13', timestamp: new Date().toISOString() },
        { barId: '13', matchId: '15', userId: 'demo-user-14', timestamp: new Date().toISOString() },
        { barId: '13', matchId: '15', userId: 'demo-user-15', timestamp: new Date().toISOString() },
      ];

      const combinedVotes = [...loadedVotes, ...demoVotes];
      setVotes(combinedVotes);
      GoingService.saveVotes(combinedVotes, localStorage);
      localStorage.setItem('barmatch_going_demo_seeded_v1', 'true');
    } else {
      setVotes(loadedVotes);
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

