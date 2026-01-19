import { FAVORITES_STORAGE_KEYS } from '../models';

/**
 * Favorites Service
 * Platform-agnostic service for managing user favorites
 * Can be used in web, mobile (Capacitor), or any other platform
 */

export class FavoritesService {
  /**
   * Load favorites from storage
   * @param storage - Storage implementation (localStorage, AsyncStorage, etc.)
   */
  static loadFavorites(storage: Storage): { teams: string[]; bars: string[] } {
    try {
      const teamsJson = storage.getItem(FAVORITES_STORAGE_KEYS.TEAMS);
      const barsJson = storage.getItem(FAVORITES_STORAGE_KEYS.BARS);

      return {
        teams: teamsJson ? JSON.parse(teamsJson) : [],
        bars: barsJson ? JSON.parse(barsJson) : [],
      };
    } catch (error) {
      console.error('Error loading favorites:', error);
      return { teams: [], bars: [] };
    }
  }

  /**
   * Save favorite teams to storage
   */
  static saveFavoriteTeams(teams: string[], storage: Storage): void {
    try {
      storage.setItem(FAVORITES_STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    } catch (error) {
      console.error('Error saving favorite teams:', error);
    }
  }

  /**
   * Save favorite bars to storage
   */
  static saveFavoriteBars(bars: string[], storage: Storage): void {
    try {
      storage.setItem(FAVORITES_STORAGE_KEYS.BARS, JSON.stringify(bars));
    } catch (error) {
      console.error('Error saving favorite bars:', error);
    }
  }

  /**
   * Toggle a team in favorites
   */
  static toggleTeam(teamId: string, currentFavorites: string[]): string[] {
    if (currentFavorites.includes(teamId)) {
      return currentFavorites.filter((id) => id !== teamId);
    } else {
      return [...currentFavorites, teamId];
    }
  }

  /**
   * Toggle a bar in favorites
   */
  static toggleBar(barId: string, currentFavorites: string[]): string[] {
    if (currentFavorites.includes(barId)) {
      return currentFavorites.filter((id) => id !== barId);
    } else {
      return [...currentFavorites, barId];
    }
  }

  /**
   * Check if a team is favorited
   */
  static isTeamFavorite(teamId: string, favorites: string[]): boolean {
    return favorites.includes(teamId);
  }

  /**
   * Check if a bar is favorited
   */
  static isBarFavorite(barId: string, favorites: string[]): boolean {
    return favorites.includes(barId);
  }
}

