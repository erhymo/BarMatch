'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bar } from '@/lib/models';

const DEBOUNCE_MS = 500;
/** Avrunder til ~1.1 km-grid slik at nærliggende pan-bevegelser treffer cache. */
const GRID = 0.01;
/** Cache-oppføringer eldre enn dette (ms) forkastes. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Beregner dynamisk søkeradius basert på zoomnivå. */
function radiusForZoom(zoom: number): number {
  // Høyere zoom = mindre synlig område = mindre radius.
  // Zoom 15 → ~800m, zoom 13 → ~2500m, zoom 10 → ~5000m
  const r = Math.round(40_000_000 / Math.pow(2, zoom));
  return Math.min(Math.max(r, 500), 5000);
}

function roundToGrid(n: number): number {
  return Math.round(n / GRID) * GRID;
}

type CacheEntry = { bars: Bar[]; ts: number };

/**
 * Henter eksterne sportsbarer (hvite baller) fra Google Places proxy
 * basert på gjeldende kart-sentrum.
 *
 * Forbedringer:
 * - Klient-side cache basert på avrundet lat/lng (unngår re-fetch av samme område)
 * - Beholder eksisterende pins mens ny fetch pågår (ingen blink)
 * - Dynamisk radius basert på zoomnivå
 */
export function useCandidateBars(
  center: { lat: number; lng: number } | null,
  zoom: number = 13,
) {
  const [candidateBars, setCandidateBars] = useState<Bar[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const getCacheKey = useCallback((lat: number, lng: number, z: number) => {
    return `${roundToGrid(lat).toFixed(3)},${roundToGrid(lng).toFixed(3)},${z}`;
  }, []);

  useEffect(() => {
    if (!center) return;
    let cancelled = false;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const radius = radiusForZoom(zoom);
    const key = getCacheKey(center.lat, center.lng, radius);

    // Sjekk cache først
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setCandidateBars(cached.bars);
      return;
    }

    // Ikke nullstill candidateBars — behold gamle pins mens vi henter nye.
    timerRef.current = setTimeout(() => {
      const run = async () => {
        try {
          const params = new URLSearchParams({
            lat: String(center.lat),
            lng: String(center.lng),
            radius: String(radius),
          });
          const res = await fetch(`/api/sportsbars?${params.toString()}`);
          if (!res.ok) {
            console.error('Failed to load sportsbars from Places proxy:', res.status);
            return;
          }
          const data = (await res.json()) as { bars?: Bar[] };
          if (!cancelled) {
            const bars = Array.isArray(data.bars) ? data.bars : [];
            cacheRef.current.set(key, { bars, ts: Date.now() });
            setCandidateBars(bars);
          }
        } catch (e) {
          console.error('Error loading sportsbars candidates', e);
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
  }, [center, zoom, getCacheKey]);

  return candidateBars;
}

