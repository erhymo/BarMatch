import { GOING_STORAGE_KEYS, GoingStatus, GoingVote } from '../types/going';

/**
 * GoingService
 * Platform-agnostic service for managing "Skal" / going votes
 */
export class GoingService {
  /**
   * Load all going votes from storage
   */
  static loadVotes(storage: Storage): GoingVote[] {
    try {
      const data = storage.getItem(GOING_STORAGE_KEYS.VOTES);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load going votes:', error);
      return [];
    }
  }

  /**
   * Save all going votes to storage
   */
  static saveVotes(votes: GoingVote[], storage: Storage): void {
    try {
      storage.setItem(GOING_STORAGE_KEYS.VOTES, JSON.stringify(votes));
    } catch (error) {
      console.error('Failed to save going votes:', error);
    }
  }

  /**
   * Toggle a user's vote for a given bar + match
   * If the user has not voted, add a vote. If they have, remove it.
   */
  static toggleVote(
    userId: string,
    barId: string,
    matchId: string,
    allVotes: GoingVote[],
  ): GoingVote[] {
    const existingIndex = allVotes.findIndex(
      (vote) =>
        vote.userId === userId && vote.barId === barId && vote.matchId === matchId,
    );

    if (existingIndex === -1) {
      const newVote: GoingVote = {
        userId,
        barId,
        matchId,
        timestamp: new Date().toISOString(),
      };
      return [...allVotes, newVote];
    }

    const updatedVotes = [...allVotes];
    updatedVotes.splice(existingIndex, 1);
    return updatedVotes;
  }

  /**
   * Get status for a specific bar + match
   */
  static getStatusForMatch(
    userId: string | null,
    barId: string,
    matchId: string,
    allVotes: GoingVote[],
  ): GoingStatus {
    const votesForMatch = allVotes.filter(
      (vote) => vote.barId === barId && vote.matchId === matchId,
    );

    const count = votesForMatch.length;
    const isGoing = !!(
      userId && votesForMatch.some((vote) => vote.userId === userId)
    );

    return {
      barId,
      matchId,
      count,
      isGoing,
    };
  }

  /**
   * Get status for all matches at a bar
   */
  static getStatusForBar(
    userId: string | null,
    barId: string,
    allVotes: GoingVote[],
  ): GoingStatus[] {
    const barVotes = allVotes.filter((vote) => vote.barId === barId);
    const result = new Map<string, GoingStatus>();

    for (const vote of barVotes) {
      const existing = result.get(vote.matchId) ?? {
        barId,
        matchId: vote.matchId,
        count: 0,
        isGoing: false,
      };

      const updated: GoingStatus = {
        ...existing,
        count: existing.count + 1,
        isGoing: existing.isGoing || (userId != null && vote.userId === userId),
      };

      result.set(vote.matchId, updated);
    }

    return Array.from(result.values());
  }
}

