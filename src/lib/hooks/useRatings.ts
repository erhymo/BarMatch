import { useState, useEffect, useCallback } from 'react';
import { BarRating } from '../models';
import { RatingService } from '../services';

/**
 * React hook for managing bar ratings
 * Wraps RatingService with React state management
 */
export function useRatings() {
  const [ratings, setRatings] = useState<BarRating[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load ratings and userId from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadedRatings = RatingService.loadRatings(localStorage);
	    // eslint-disable-next-line react-hooks/set-state-in-effect
	    setRatings(loadedRatings);

	    const existingUserId = localStorage.getItem('where2watch_user_id');
    if (existingUserId) {
	      setUserId(existingUserId);
    } else {
      const newUserId = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
	      localStorage.setItem('where2watch_user_id', newUserId);
	      setUserId(newUserId);
    }

	    setIsInitialized(true);
  }, []);

  // Save ratings to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    RatingService.saveRatings(ratings, localStorage);
  }, [ratings, isInitialized]);

  /**
   * Get rating data for a specific bar
   */
  const getBarRating = useCallback(
    (barId: string) => {
      return RatingService.getBarRating(barId, ratings);
    },
    [ratings]
  );

  /**
   * Get current user's rating for a specific bar
   */
  const getUserRatingForBar = useCallback(
    (barId: string) => {
      if (!userId) return null;
      return RatingService.getUserRatingForBar(userId, barId, ratings);
    },
    [ratings, userId]
  );

  /**
   * Rate a bar (1-5 stars)
   */
  const rateBar = useCallback(
    (barId: string, rating: number) => {
      if (!userId) return;
      setRatings((prev) => RatingService.addOrUpdateRating(userId, barId, rating, prev));
    },
    [userId]
  );

  /**
   * Remove current user's rating for a bar
   */
  const clearRatingForBar = useCallback(
    (barId: string) => {
      if (!userId) return;
      setRatings((prev) => RatingService.removeRating(userId, barId, prev));
    },
    [userId]
  );

  return {
    ratings,
    userId,
    getBarRating,
    getUserRatingForBar,
    rateBar,
    clearRatingForBar,
  };
}

