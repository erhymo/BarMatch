'use client';

import Link from 'next/link';

interface BarStatusSectionProps {
  isVisible: boolean | undefined;
  matchesNext7DaysCount: number;
  todayKey: string;
}

export function BarStatusSection({ isVisible, matchesNext7DaysCount, todayKey }: BarStatusSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Status</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Visibility card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Synlighet</div>
            <span className="relative flex h-2.5 w-2.5">
              {isVisible && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isVisible ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            </span>
          </div>
          <div className={`mt-2 text-lg font-bold ${isVisible ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {isVisible ? 'Synlig' : 'Skjult'}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {isVisible
              ? 'Supportere ser baren din i søk.'
              : 'Skru på synlighet under betaling.'}
          </p>
        </div>

        {/* Match count card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Kamper neste 7 dager</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold tabular-nums ${matchesNext7DaysCount > 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-300 dark:text-zinc-600'}`}>
              {matchesNext7DaysCount}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              kamp{matchesNext7DaysCount === 1 ? '' : 'er'}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {matchesNext7DaysCount > 0
              ? 'Disse vises for supportere som ser på baren.'
              : 'Velg kamper i planleggeren over.'}
          </p>
          {matchesNext7DaysCount === 0 && (
            <Link
              href={`/admin/bar/fixtures/day/${todayKey}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Legg til kamper →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

