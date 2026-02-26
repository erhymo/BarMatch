'use client';

import { useEffect, useMemo, useState } from 'react';
import { dummyBars } from '@/lib/data/bars';
import { Bar } from '@/lib/models';

/**
 * Henter synlige barer fra Firestore via det offentlige API-et.
 * Faller tilbake til dummy-barer dersom henting feiler.
 */
export function usePublicBars() {
  const [publicBars, setPublicBars] = useState<Bar[] | null>(null);
  const [publicBarsError, setPublicBarsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setPublicBarsError(null);
        const res = await fetch('/api/bars');
        if (!res.ok) throw new Error(`Failed to load bars (${res.status})`);
        const data = (await res.json()) as { bars?: Bar[] };
        if (!cancelled) {
          setPublicBars(Array.isArray(data.bars) ? data.bars : []);
        }
      } catch (e) {
        if (!cancelled) {
          setPublicBars(null);
          setPublicBarsError(e instanceof Error ? e.message : 'Failed to load bars');
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = publicBars === null && !publicBarsError;

  const bars = useMemo(() => {
    if (publicBarsError) return dummyBars;
    if (publicBars === null) return [];
    return publicBars;
  }, [publicBars, publicBarsError]);

  return { bars, isLoading, error: publicBarsError };
}

