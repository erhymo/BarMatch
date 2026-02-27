'use client';

import Link from 'next/link';

interface BarStatusSectionProps {
  isVisible: boolean | undefined;
  matchesNext7DaysCount: number;
  todayKey: string;
}

export function BarStatusSection({ isVisible, matchesNext7DaysCount, todayKey }: BarStatusSectionProps) {
  return (
    <section className="mb-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Status for baren
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Synlighet</div>
          <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {isVisible ? 'Synlig på kartet' : 'Skjult på kartet'}
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {isVisible
              ? 'Baren din er synlig for supportere som søker i området.'
              : 'Skru på «Gjør synlig» under for å dukke opp i søk.'}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Kamper neste 7 dager</div>
          <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {matchesNext7DaysCount} kamp{matchesNext7DaysCount === 1 ? '' : 'er'}
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {matchesNext7DaysCount > 0
              ? 'Disse kampene vises for brukere som ser på baren din.'
              : 'Ingen valgte kamper den neste uken ennå.'}
          </p>
          <Link
            href={`/admin/bar/fixtures/day/${todayKey}`}
            className="mt-2 inline-flex text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Juster kamper
          </Link>
        </div>
      </div>
    </section>
  );
}

