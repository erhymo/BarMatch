'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFavorites as useFavoritesHook } from '@/lib/hooks';

interface FavoritesContextType {
  favoriteTeams: string[];
  favoriteBars: string[];
  toggleFavoriteTeam: (teamId: string) => void;
  toggleFavoriteBar: (barId: string) => void;
  isFavoriteTeam: (teamId: string) => boolean;
  isFavoriteBar: (barId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favorites = useFavoritesHook();

  return (
    <FavoritesContext.Provider value={favorites}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

