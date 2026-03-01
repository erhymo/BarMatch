'use client';

import { useTranslation } from '@/lib/i18n';

interface MapOverlaysProps {
  isLoadingBars: boolean;
  barsError: string | null;
  selectedTeam: string | null;
  matchId: string | null;
  filteredBarsCount: number;
}

export default function MapOverlays({
  isLoadingBars,
  barsError,
  selectedTeam,
  matchId,
  filteredBarsCount,
}: MapOverlaysProps) {
  const { t } = useTranslation();

  return (
    <>
      {isLoadingBars && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
            {t('map_loading_bars')}
          </div>
        </div>
      )}

      {barsError && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-amber-50/95 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 shadow-md text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium mb-1">{t('map_error_title')}</p>
            <p className="text-xs opacity-90">{t('map_error_subtitle')} ({barsError})</p>
          </div>
        </div>
      )}

      {!isLoadingBars && selectedTeam && filteredBarsCount === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
            <p className="font-medium mb-1">{t('map_no_bars_team')}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{t('map_try_other')}</p>
          </div>
        </div>
      )}

      {!isLoadingBars && matchId && !selectedTeam && filteredBarsCount === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
            <p className="font-medium mb-1">{t('map_no_bars_match')}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{t('map_try_other')}</p>
          </div>
        </div>
      )}
    </>
  );
}

