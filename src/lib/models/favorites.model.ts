/**
 * Favorites model
 * Represents user's favorite teams and bars
 */
export interface Favorites {
  teams: string[]; // Array of team IDs
  bars: string[]; // Array of bar IDs
}

/**
 * Storage keys for localStorage
 */
export const FAVORITES_STORAGE_KEYS = {
  TEAMS: 'barmatch_favorite_teams',
  BARS: 'barmatch_favorite_bars',
} as const;

