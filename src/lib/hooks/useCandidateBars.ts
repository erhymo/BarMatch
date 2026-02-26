'use client';

import { useEffect, useRef, useState } from 'react';
import { Bar } from '@/lib/models';

const DEBOUNCE_MS = 500;

/**
 * Henter eksterne sportsbarer (hvite baller) fra Google Places proxy
 * basert på gjeldende kart-sentrum.
 *
 * Debouncer viewport-endringer slik at vi ikke sender et API-kall
 * for hvert enkelt pan/zoom-steg.
 */
export function useCandidateBars(center: { lat: number; lng: number } | null) {
  const [candidateBars, setCandidateBars] = useState<Bar[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!center) return;
    let cancelled = false;

    // Avbryt eventuell ventende debounce-timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const run = async () => {
        try {
          const params = new URLSearchParams({
            lat: String(center.lat),
            lng: String(center.lng),
            radius: String(2500),
          });
          const res = await fetch(`/api/sportsbars?${params.toString()}`);
          if (!res.ok) {
            console.error('Failed to load sportsbars from Places proxy:', res.status);
            if (!cancelled) setCandidateBars([]);
            return;
          }
          const data = (await res.json()) as { bars?: Bar[] };
          if (!cancelled) {
            setCandidateBars(Array.isArray(data.bars) ? data.bars : []);
          }
        } catch (e) {
          console.error('Error loading sportsbars candidates', e);
          if (!cancelled) setCandidateBars([]);
        }
      };
      void run();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [center]);

  return candidateBars;
}

