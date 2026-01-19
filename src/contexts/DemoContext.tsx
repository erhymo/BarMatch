'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { DemoService } from '@/lib/services';

interface DemoContextType {
  resetDemoData: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const DEMO_BOOTSTRAP_KEY = 'barmatch_demo_bootstrap_done';

export function DemoProvider({ children }: { children: ReactNode }) {
  // Ensure demo data exists on very first load in this browser.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storage = window.localStorage;
    const hasBootstrapped = storage.getItem(DEMO_BOOTSTRAP_KEY);

    if (!hasBootstrapped) {
      // Mark as bootstrapped before reset to avoid loops
      storage.setItem(DEMO_BOOTSTRAP_KEY, 'true');
      DemoService.resetDemoData(storage);
      // Reload so all providers/hooks read the seeded state
      window.location.reload();
    }
  }, []);

  const resetDemoData = useCallback(() => {
    if (typeof window === 'undefined') return;
    DemoService.resetDemoData(window.localStorage);
    window.location.reload();
  }, []);

  return (
    <DemoContext.Provider value={{ resetDemoData }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextType {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return ctx;
}
