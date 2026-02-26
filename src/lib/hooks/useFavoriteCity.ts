'use client';

import { useEffect, useState } from 'react';
import type { CityId } from '@/lib/data/cities';

const STORAGE_KEY = 'where2watch.favoriteCity';
const LEGACY_KEY = 'matchbar.favoriteCity';

function isValidCityId(value: unknown): value is CityId {
  return (
    value === 'oslo' ||
    value === 'bergen' ||
    value === 'forde' ||
    value === 'trondheim'
  );
}

/**
 * Håndterer favoritt-by med localStorage-persistering.
 * Inkluderer migrering fra legacy-nøkkel.
 */
export function useFavoriteCity() {
  const [favoriteCity, setFavoriteCity] = useState<CityId | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isValidCityId(stored)) return stored;
    } catch {
      // Ignorer feil fra localStorage
    }
    return null;
  });

  // Migrate legacy key → new key
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (!legacy) return;

      if (isValidCityId(legacy)) {
        setFavoriteCity((current) => (current ? current : legacy));
      }

      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (favoriteCity) {
        window.localStorage.setItem(STORAGE_KEY, favoriteCity);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignorer feil fra localStorage
    }
  }, [favoriteCity]);

  return { favoriteCity, setFavoriteCity };
}

