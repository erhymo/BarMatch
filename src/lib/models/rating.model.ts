/**
 * Rating models
 * Represents user ratings for bars
 */

/**
 * Individual rating from a user
 */
export interface UserRating {
  userId: string;
  barId: string;
  rating: number; // 1-5
  timestamp: string; // ISO datetime string
}

/**
 * Aggregated rating data for a bar
 */
export interface BarRating {
  barId: string;
  averageRating: number;
  totalRatings: number;
  ratings: UserRating[];
}

/**
 * Storage keys for localStorage
 */
export const RATING_STORAGE_KEYS = {
  RATINGS: 'barmatch_bar_ratings',
} as const;

