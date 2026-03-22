'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { dummyBars } from '@/lib/data/bars';
import type { Bar } from '@/lib/models';

type PublicBarsResponse = {
  bars?: Bar[];
  error?: string;
};

/**
 * Henter synlige barer fra Firestore via det offentlige API-et.
 * Faller tilbake til dummy-barer dersom henting feiler.
 */
export function usePublicBars() {
  const [publicBars, setPublicBars] = useState<Bar[] | null>(null);
  const [publicBarsError, setPublicBarsError] = useState<string | null>(null);

  const loadBars = useCallback(async (signal?: AbortSignal) => {
    try {
      setPublicBarsError(null);
      const res = await fetch('/api/bars', { signal });
      const data = (await res.json().catch(() => null)) as PublicBarsResponse | null;

      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' && data.error.trim()
            ? data.error.trim()
            : `Failed to load bars (${res.status})`,
        );
      }

      setPublicBars(Array.isArray(data?.bars) ? data.bars : []);
    } catch (e) {
      if (signal?.aborted) return;
      setPublicBars(null);
      setPublicBarsError(e instanceof Error ? e.message : 'Failed to load bars');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBars(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadBars]);

  const isLoading = publicBars === null && !publicBarsError;
  const liveBars = useMemo(() => (publicBars === null ? [] : publicBars), [publicBars]);
  const usingFallbackBars = publicBarsError !== null;

  const bars = useMemo(() => {
    if (publicBarsError) return dummyBars;
    if (publicBars === null) return [];
    return publicBars;
  }, [publicBars, publicBarsError]);

  return {
    bars,
    liveBars,
    isLoading,
    error: publicBarsError,
    usingFallbackBars,
  };
}

