'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useRatings as useRatingsHook } from '@/lib/hooks';

interface RatingsContextType {
  ratings: ReturnType<typeof useRatingsHook>['ratings'];
  userId: ReturnType<typeof useRatingsHook>['userId'];
  getBarRating: ReturnType<typeof useRatingsHook>['getBarRating'];
  getUserRatingForBar: ReturnType<typeof useRatingsHook>['getUserRatingForBar'];
  rateBar: ReturnType<typeof useRatingsHook>['rateBar'];
  clearRatingForBar: ReturnType<typeof useRatingsHook>['clearRatingForBar'];
}

const RatingsContext = createContext<RatingsContextType | null>(null);

export function RatingsProvider({ children }: { children: ReactNode }) {
  const ratingsHook = useRatingsHook();

  return (
    <RatingsContext.Provider value={ratingsHook}>
      {children}
    </RatingsContext.Provider>
  );
}

export function useRatings() {
  const context = useContext(RatingsContext);
  if (!context) {
    throw new Error('useRatings must be used within a RatingsProvider');
  }
  return context;
}

