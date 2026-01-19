import { useState, useEffect, useCallback } from 'react';
import { FavoritesService } from '../services';

/**
 * React hook for managing favorites
 * Wraps FavoritesService with React state management
 */
export function useFavorites() {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [favoriteBars, setFavoriteBars] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const favorites = FavoritesService.loadFavorites(localStorage);
    setFavoriteTeams(favorites.teams);
    setFavoriteBars(favorites.bars);
    setIsInitialized(true);
  }, []);

  // Save favorite teams to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    FavoritesService.saveFavoriteTeams(favoriteTeams, localStorage);
  }, [favoriteTeams, isInitialized]);

  // Save favorite bars to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    FavoritesService.saveFavoriteBars(favoriteBars, localStorage);
  }, [favoriteBars, isInitialized]);

  const toggleFavoriteTeam = useCallback((teamId: string) => {
    setFavoriteTeams((prev) => FavoritesService.toggleTeam(teamId, prev));
  }, []);

  const toggleFavoriteBar = useCallback((barId: string) => {
    setFavoriteBars((prev) => FavoritesService.toggleBar(barId, prev));
  }, []);

  const isFavoriteTeam = useCallback(
    (teamId: string) => {
      return FavoritesService.isTeamFavorite(teamId, favoriteTeams);
    },
    [favoriteTeams]
  );

  const isFavoriteBar = useCallback(
    (barId: string) => {
      return FavoritesService.isBarFavorite(barId, favoriteBars);
    },
    [favoriteBars]
  );

  return {
    favoriteTeams,
    favoriteBars,
    toggleFavoriteTeam,
    toggleFavoriteBar,
    isFavoriteTeam,
    isFavoriteBar,
  };
}

