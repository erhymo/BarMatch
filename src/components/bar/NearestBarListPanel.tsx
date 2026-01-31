'use client';

import { useMemo } from 'react';
import { BarService } from '@/lib/services';
import type { Bar, Position } from '@/lib/models';

export default function NearestBarListPanel(props: {
  bars: Bar[];
  userPosition: Position | null;
  onSelectBar: (bar: Bar) => void;
  onClose: () => void;
}) {
  const { bars, userPosition, onSelectBar, onClose } = props;

  const items = useMemo(() => {
    if (!userPosition) {
      return [...bars]
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
        .map((bar) => ({ bar, distanceLabel: null }));
    }

    return BarService.sortBarsByDistance(bars, userPosition).map((bar) => {
      const km = BarService.calculateDistance(userPosition, bar.position);
      return { bar, distanceLabel: BarService.formatDistance(km) };
    });
  }, [bars, userPosition]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-zinc-900">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="px-6 pb-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Barer nær deg</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {userPosition
                  ? 'Sortert på avstand.'
                  : 'Aktiver posisjon for å sortere på avstand.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950"
            >
              Lukk
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              Ingen barer å vise med gjeldende filter.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {items.slice(0, 40).map(({ bar, distanceLabel }) => (
                <button
                  key={bar.id}
                  type="button"
                  onClick={() => onSelectBar(bar)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">{bar.name}</div>
                    {bar.address ? (
                      <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">{bar.address}</div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-sm text-zinc-700 dark:text-zinc-200">
                    {distanceLabel ?? '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
