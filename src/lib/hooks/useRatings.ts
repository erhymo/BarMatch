import { useState, useEffect, useCallback } from 'react';
import { BarRating, UserRating } from '../models';
import { RatingService } from '../services';

const USER_ID_STORAGE_KEY = 'where2watch_user_id';

type RatingsResponse = {
  ratings?: BarRating[];
};

type RatingMutationResponse = {
  ok?: boolean;
  rating?: BarRating;
  error?: string;
};

type RatingActionResult = {
  ok: boolean;
  error?: string;
};

function upsertBarRating(current: BarRating[], next: BarRating): BarRating[] {
  const index = current.findIndex((rating) => rating.barId === next.barId);
  if (index === -1) return [...current, next];

  const updated = [...current];
  updated[index] = next;
  return updated;
}

function removeBarRating(current: BarRating[], barId: string): BarRating[] {
  return current.filter((rating) => rating.barId !== barId);
}

/**
 * React hook for managing bar ratings
 * Wraps remote ratings API with React state management
 */
export function useRatings() {
  const [ratings, setRatings] = useState<BarRating[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Load/generate anonymous user id on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

	    const existingUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existingUserId) {
	      setUserId(existingUserId);
    } else {
      const newUserId = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
	      localStorage.setItem(USER_ID_STORAGE_KEY, newUserId);
	      setUserId(newUserId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/ratings?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to load ratings (${response.status})`);
        }

        const data = (await response.json()) as RatingsResponse;
        if (!cancelled) {
          setRatings(Array.isArray(data.ratings) ? data.ratings : []);
        }
      } catch (error) {
        console.error('Failed to load ratings from API:', error);
        if (!cancelled) {
          setRatings([]);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
    async (barId: string, rating: number): Promise<RatingActionResult> => {
      if (!userId) return { ok: false, error: 'Missing user id' };

      try {
        const response = await fetch('/api/ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, barId, rating }),
        });

        const data = (await response.json()) as RatingMutationResponse;
        if (!response.ok || !data.rating) {
          return { ok: false, error: data.error ?? 'Could not save rating' };
        }

        setRatings((prev) => upsertBarRating(prev, data.rating!));
        return { ok: true };
      } catch (error) {
        console.error('Failed to save rating:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Could not save rating' };
      }
    },
    [userId]
  );

  /**
   * Remove current user's rating for a bar
   */
  const clearRatingForBar = useCallback(
    async (barId: string): Promise<RatingActionResult> => {
      if (!userId) return { ok: false, error: 'Missing user id' };

      try {
        const params = new URLSearchParams({ userId, barId });
        const response = await fetch(`/api/ratings?${params.toString()}`, {
          method: 'DELETE',
        });

        const data = (await response.json()) as RatingMutationResponse;
        if (!response.ok) {
          return { ok: false, error: data.error ?? 'Could not remove rating' };
        }

        if (data.rating) {
          const nextUserRating: UserRating | null = RatingService.getUserRatingForBar(userId, barId, [data.rating]);
          if (data.rating.totalRatings <= 0 && !nextUserRating) {
            setRatings((prev) => removeBarRating(prev, barId));
          } else {
            setRatings((prev) => upsertBarRating(prev, data.rating!));
          }
        } else {
          setRatings((prev) => removeBarRating(prev, barId));
        }

        return { ok: true };
      } catch (error) {
        console.error('Failed to remove rating:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Could not remove rating' };
      }
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

