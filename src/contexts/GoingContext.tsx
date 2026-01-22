'use client';

import { ReactNode, createContext, useContext } from 'react';
import { useGoing as useGoingHook } from '@/lib/hooks';

interface GoingContextType {
  votes: ReturnType<typeof useGoingHook>['votes'];
  userId: ReturnType<typeof useGoingHook>['userId'];
  getGoingStatusForMatch: ReturnType<typeof useGoingHook>['getGoingStatusForMatch'];
  getGoingForBar: ReturnType<typeof useGoingHook>['getGoingForBar'];
  toggleGoing: ReturnType<typeof useGoingHook>['toggleGoing'];
}

const GoingContext = createContext<GoingContextType | null>(null);

export function GoingProvider({ children }: { children: ReactNode }) {
  const going = useGoingHook();

  return <GoingContext.Provider value={going}>{children}</GoingContext.Provider>;
}

export function useGoing() {
  const context = useContext(GoingContext);
  if (!context) {
    throw new Error('useGoing must be used within a GoingProvider');
  }
  return context;
}

