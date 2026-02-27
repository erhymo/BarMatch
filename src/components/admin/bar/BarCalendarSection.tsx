'use client';

import Link from 'next/link';
import type { Fixture } from '@/lib/types/fixtures';
import { formatCalendarDate } from '@/lib/admin/bar/types';

interface BarCalendarSectionProps {
  calendarRangeDays: number;
  fixturesError: string | null;
  isLoadingFixtures: boolean;
  hasAnyFixtures: boolean;
  hasSelectedFixturesInCalendar: boolean;
  calendarDays: { key: string; date: Date }[];
  selectedFixturesByDateKey: Map<string, Fixture[]>;
  todayKey: string;
}

export function BarCalendarSection({
  calendarRangeDays,
  fixturesError,
  isLoadingFixtures,
  hasAnyFixtures,
  hasSelectedFixturesInCalendar,
  calendarDays,
  selectedFixturesByDateKey,
  todayKey,
}: BarCalendarSectionProps) {
  return (
    <section className="mb-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Kalender: valgte kamper</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Oversikt over kampene du har valgt å vise på baren din (neste {calendarRangeDays} dager).
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Klikk på en dag i kalenderen under for å justere kampene den dagen, eller bruk
              <span className="font-medium"> fullskjerm-planleggeren</span>.
            </p>
          </div>
          <Link
            href="/admin/bar/fixtures/planner"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Planlegg
          </Link>
        </div>

        {fixturesError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {fixturesError}
          </div>
        )}

        {isLoadingFixtures && !hasAnyFixtures ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Laster kamper…</p>
        ) : !hasAnyFixtures ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Ingen kommende kamper i kalenderperioden.
          </p>
        ) : !hasSelectedFixturesInCalendar ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Du har ikke valgt noen kamper ennå. Klikk på en dag i kalenderen under, eller bruk
            knappen «Planlegg» for å velge kamper i fullskjerm.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {calendarDays.map(({ key, date }) => {
              const dayFixtures = selectedFixturesByDateKey.get(key) ?? [];
              const isToday = key === todayKey;
              if (dayFixtures.length === 0) {
                return (
                  <Link key={key} href={`/admin/bar/fixtures/day/${key}`}
                    className="flex flex-col rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 transition-colors hover:border-emerald-500 hover:bg-emerald-50/60 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">{formatCalendarDate(date)}</span>
                      {isToday && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">I dag</span>
                      )}
                    </div>
                    <span className="mt-2 text-sm">Ingen valgte kamper</span>
                  </Link>
                );
              }
              const maxVisible = 2;
              const visible = dayFixtures.slice(0, maxVisible);
              const remaining = dayFixtures.length - visible.length;
              return (
                <Link key={key} href={`/admin/bar/fixtures/day/${key}`}
                  className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 transition-colors hover:border-emerald-500 hover:bg-emerald-50/60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{formatCalendarDate(date)}</span>
                    {isToday && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">I dag</span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {visible.map((f) => (
                      <div key={f.id} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-[13px] font-medium dark:bg-zinc-800/80">
                        {f.homeTeam} – {f.awayTeam}
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="pt-0.5 text-xs text-zinc-500 dark:text-zinc-400">+{remaining} flere kamper</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

