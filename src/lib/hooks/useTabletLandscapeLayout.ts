'use client';

import { useEffect, useState } from 'react';

const TABLET_LANDSCAPE_MEDIA_QUERY =
  '(min-width: 768px) and (max-width: 1366px) and (orientation: landscape) and (pointer: coarse)';

export function useTabletLandscapeLayout() {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(TABLET_LANDSCAPE_MEDIA_QUERY);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMatches);
      return () => mediaQuery.removeEventListener('change', updateMatches);
    }

    mediaQuery.addListener(updateMatches);
    return () => mediaQuery.removeListener(updateMatches);
  }, []);

  return matches;
}