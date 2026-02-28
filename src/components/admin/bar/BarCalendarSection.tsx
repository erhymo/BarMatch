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
    <section>
      <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30 p-5 shadow-sm dark:border-emerald-900/40 dark:from-zinc-950 dark:to-emerald-950/10">
        {/* Section header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Kampkalender</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Oversikt over valgte kamper de neste {calendarRangeDays} dagene. Klikk en dag for å justere.
            </p>
          </div>
        </div>

        {/* ── Prominent "Planlegg" CTA ── */}
        <Link
          href="/admin/bar/fixtures/planner"
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-150 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/25 active:scale-[0.98] dark:bg-emerald-500 dark:shadow-emerald-500/15 dark:hover:bg-emerald-600 sm:w-auto sm:inline-flex"
        >
          <span className="text-base">▶</span>
          Åpne kampplanlegger
        </Link>

        {fixturesError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {fixturesError}
          </div>
        )}

        {isLoadingFixtures && !hasAnyFixtures ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Laster kamper…</p>
        ) : !hasAnyFixtures ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Ingen kommende kamper i kalenderperioden.
          </p>
        ) : !hasSelectedFixturesInCalendar ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Du har ikke valgt noen kamper ennå. Bruk <span className="font-semibold text-emerald-600 dark:text-emerald-400">kampplanleggeren</span> over for å komme i gang.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {calendarDays.map(({ key, date }) => {
              const dayFixtures = selectedFixturesByDateKey.get(key) ?? [];
              const isToday = key === todayKey;
              if (dayFixtures.length === 0) {
                return (
                  <Link key={key} href={`/admin/bar/fixtures/day/${key}`}
                    className="group flex flex-col rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3.5 text-sm text-zinc-500 transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">{formatCalendarDate(date)}</span>
                      {isToday && <TodayBadge />}
                    </div>
                    <span className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Ingen kamper</span>
                  </Link>
                );
              }
              const maxVisible = 2;
              const visible = dayFixtures.slice(0, maxVisible);
              const remaining = dayFixtures.length - visible.length;
              return (
                <Link key={key} href={`/admin/bar/fixtures/day/${key}`}
                  className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-800 transition-all duration-150 hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-emerald-500">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">{formatCalendarDate(date)}</span>
                    {isToday ? <TodayBadge /> : (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        {dayFixtures.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {visible.map((f) => (
                      <div key={f.id} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[12px] font-medium leading-snug dark:bg-zinc-800/80">
                        {f.homeTeam} – {f.awayTeam}
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">+{remaining} til</div>
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

function TodayBadge() {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">
      I dag
    </span>
  );
}

