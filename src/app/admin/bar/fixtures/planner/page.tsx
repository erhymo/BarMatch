'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { useToast } from '@/contexts/ToastContext';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getFixtureProvider } from '@/lib/providers/fixtures';
import { getCompetitionByKey } from '@/lib/config/competitions';

const DEFAULT_RANGE_DAYS = 30;
const LEAGUES: LeagueKey[] = ['EPL', 'NOR_ELITESERIEN', 'SERIE_A', 'UCL', 'UEL'];

type BarDoc = {
  id: string;
  name?: string;
  selectedFixtureIds?: unknown;
  cancelledFixtureIds?: unknown;
};

type SelectionState = {
  selected: string[];
  cancelled: string[];
};

type CalendarDay = {
  key: string;
  date: Date;
};

type CalendarInit = {
  calendarDays: CalendarDay[];
  range: { from: string; to: string };
  todayKey: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

function dateKeyFromUtcIso(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Ukjent dato';
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatKickoff(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createCalendarDays(baseMs: number, days: number): CalendarDay[] {
  const start = new Date(baseMs);
  start.setHours(0, 0, 0, 0);
  const list: CalendarDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start.getTime() + i * ONE_DAY_MS);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    list.push({
      key: `${year}-${month}-${day}`,
      date: d,
    });
  }
  return list;
}

function createInitialCalendar(): CalendarInit {
  const nowMs = Date.now();
  const calendarDays = createCalendarDays(nowMs, DEFAULT_RANGE_DAYS);
  const from = new Date(nowMs).toISOString();
  const to = new Date(nowMs + DEFAULT_RANGE_DAYS * ONE_DAY_MS).toISOString();
  return {
    calendarDays,
    range: { from, to },
    todayKey: calendarDays[0]?.key ?? null,
  };
}

function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function BarFixturesPlannerPageInner() {
  const { showToast } = useToast();
  const { user, me } = useRequireAdminRole(['bar_owner']);
  const searchParams = useSearchParams();

  const [calendarInit] = useState<CalendarInit>(() => createInitialCalendar());
  const { calendarDays, range, todayKey } = calendarInit;

  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selection, setSelection] = useState<SelectionState>({ selected: [], cancelled: [] });
  const [activeLeagues, setActiveLeagues] = useState<LeagueKey[]>(LEAGUES);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const fixtureProvider = useMemo(() => getFixtureProvider(), []);
  const selectedSet = useMemo(() => new Set(selection.selected), [selection.selected]);
  const cancelledSet = useMemo(() => new Set(selection.cancelled), [selection.cancelled]);

  const fixturesByDay = useMemo(() => {
    const groups = new Map<string, Fixture[]>();
    for (const f of fixtures) {
      if (!activeLeagues.includes(f.league)) continue;
      const key = dateKeyFromUtcIso(f.kickoffUtc);
      const list = groups.get(key) ?? [];
      list.push(f);
      groups.set(key, list);
    }
    return groups;
  }, [fixtures, activeLeagues]);

  const hasAnyFixtures = fixtures.length > 0;
  const hasVisibleFixtures = fixturesByDay.size > 0;

  const dateFromUrl = searchParams.get('date');
  const hasInitialisedSelectedDateRef = useRef(false);

  useEffect(() => {
    if (hasInitialisedSelectedDateRef.current) return;
    const candidate = dateFromUrl || todayKey;
    if (!candidate) {
      hasInitialisedSelectedDateRef.current = true;
      return;
    }
    const exists = calendarDays.some((d) => d.key === candidate);
    setSelectedDateKey(exists ? candidate : calendarDays[0]?.key ?? null);
    hasInitialisedSelectedDateRef.current = true;
  }, [calendarDays, dateFromUrl, todayKey]);

  // Load bar doc and current selection
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user || !me || me.role !== 'bar_owner' || !me.barId) return;
      setBusy(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/bars/${me.barId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load bar (${res.status})`);
        const data = (await res.json()) as BarDoc;
        if (cancelled) return;

        const selected = parseStringArray(data.selectedFixtureIds);
        const cancelledIds = parseStringArray(data.cancelledFixtureIds).filter((id) =>
          selected.includes(id),
        );

        setBar(data);
        setSelection({ selected, cancelled: cancelledIds });
      } catch (e) {
        if (cancelled) return;
        showToast({
          title: 'Feil',
          description: e instanceof Error ? e.message : 'Ukjent feil',
          variant: 'error',
        });
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user, me, showToast]);

  // Load fixtures for range
  useEffect(() => {
    let cancelled = false;

    async function loadFixtures() {
      setIsLoadingFixtures(true);
      setFixturesError(null);
      try {
        const results = await Promise.allSettled(
          LEAGUES.map((league) => fixtureProvider.getUpcomingFixtures(league, range.from, range.to)),
        );
        if (cancelled) return;

        const all: Fixture[] = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled') all.push(...r.value);
          else console.error('[BarFixturesPlanner] Fixture fetch failed:', r.reason);
        });

        const deduped = new Map<string, Fixture>();
        all.forEach((f) => deduped.set(f.id, f));

        const list = Array.from(deduped.values()).sort(
          (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
        );
        setFixtures(list);
      } catch (e) {
        if (cancelled) return;
        setFixturesError('Kunne ikke laste kamper fra API.');
        console.error(e);
      } finally {
        if (!cancelled) setIsLoadingFixtures(false);
      }
    }

    void loadFixtures();
    return () => {
      cancelled = true;
    };
  }, [fixtureProvider, range.from, range.to]);

  const saveSelection = useCallback(
    async (nextSelection: SelectionState) => {
      if (!user || !me?.barId) return;
      setIsSaving(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/bars/${me.barId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedFixtureIds: nextSelection.selected,
            cancelledFixtureIds: nextSelection.cancelled,
          }),
        });

        const raw: unknown = await res.json().catch(() => ({}));
        const data =
          raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : null;
        if (!res.ok) {
          const msg = typeof data?.error === 'string' ? data.error : '';
          throw new Error(msg || `Failed to save (${res.status})`);
        }
      } catch (e) {
        showToast({
          title: 'Feil',
          description: e instanceof Error ? e.message : 'Ukjent feil ved lagring',
          variant: 'error',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [user, me, showToast],
  );

  const toggleLeague = (league: LeagueKey) => {
    setActiveLeagues((prev) =>
      prev.includes(league) ? prev.filter((l) => l !== league) : [...prev, league],
    );
  };

  const allLeaguesSelected = activeLeagues.length === LEAGUES.length;

  const toggleAllLeagues = () => {
    setActiveLeagues((prev) => (prev.length === LEAGUES.length ? [] : LEAGUES));
  };

  const handleToggleSelected = (fixtureId: string) => {
    setSelection((prev) => {
      const selected = new Set(prev.selected);
      const cancelledIds = new Set(prev.cancelled);
      if (selected.has(fixtureId)) {
        selected.delete(fixtureId);
        cancelledIds.delete(fixtureId);
      } else {
        selected.add(fixtureId);
      }
      const next = { selected: Array.from(selected), cancelled: Array.from(cancelledIds) };
      void saveSelection(next);
      return next;
    });
  };

  const handleToggleCancelled = (fixtureId: string) => {
    setSelection((prev) => {
      if (!prev.selected.includes(fixtureId)) return prev;
      const cancelledIds = new Set(prev.cancelled);
      if (cancelledIds.has(fixtureId)) cancelledIds.delete(fixtureId);
      else cancelledIds.add(fixtureId);
      const next = { ...prev, cancelled: Array.from(cancelledIds) };
      void saveSelection(next);
      return next;
    });
  };

  const selectedDayFixtures =
    selectedDateKey != null ? fixturesByDay.get(selectedDateKey) ?? [] : [];

  const totalSelected = selection.selected.length;
  const totalCancelled = selection.cancelled.length;

  const selectedDayDate = selectedDateKey
    ? calendarDays.find((d) => d.key === selectedDateKey)?.date ?? null
    : null;

	  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Planlegg kamper
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Velg hvilke kamper baren din skal vise i de neste {DEFAULT_RANGE_DAYS} dagene.
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Bar: <span className="font-medium">{bar?.name ?? '—'}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Endringer lagres automatisk når du klikker på kampene.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/admin/bar"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Tilbake til bar-panel
          </Link>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {isSaving ? 'Lagrer…' : 'Alle endringer er lagret.'}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          valgte: {totalSelected}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          avlyst: {totalCancelled}
        </span>
        {busy && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            Laster bar…
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Filtrer på ligaer
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAllLeagues}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              allLeaguesSelected
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'
            }`}
          >
            {allLeaguesSelected ? 'Alle ligaer' : 'Velg alle'}
          </button>
          {LEAGUES.map((league) => {
            const comp = getCompetitionByKey(league);
            const isActive = activeLeagues.includes(league);
            return (
              <button
                key={league}
                type="button"
                onClick={() => toggleLeague(league)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'
                }`}
              >
                {comp.label}
              </button>
            );
          })}
        </div>
      </div>

      {fixturesError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {fixturesError}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Kalender neste {DEFAULT_RANGE_DAYS} dager</span>
          <span>
            Klikk på en dag for å se og endre kampene den dagen. Grønn prikk betyr at det er valgte
            kamper.
          </span>
        </div>
        {isLoadingFixtures && !hasAnyFixtures ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Laster kamper…</p>
        ) : !hasAnyFixtures ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ingen kommende kamper i denne perioden.
          </p>
        ) : !hasVisibleFixtures ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ingen kamper for de valgte ligaene. Juster filteret over.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {calendarDays.map(({ key, date }) => {
              const dayFixtures = fixturesByDay.get(key) ?? [];
              const totalForDay = dayFixtures.length;
              const selectedForDay = dayFixtures.filter(
                (f) => selectedSet.has(f.id) && !cancelledSet.has(f.id),
              );
              const hasSelectedForDay = selectedForDay.length > 0;
              const isToday = key === todayKey;
              const isActive = key === selectedDateKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey((prev) => (prev === key ? null : key))
                  }
                  className={`flex flex-col rounded-xl border p-3 text-left text-xs transition-colors ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCalendarDate(date)}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">
                        I dag
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {totalForDay === 0
                        ? 'Ingen kamper'
                        : `${totalForDay} kamp${totalForDay === 1 ? '' : 'er'}`}
                    </span>
                    {hasSelectedForDay && (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDateKey && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {selectedDayDate ? formatCalendarDate(selectedDayDate) : selectedDateKey}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Klikk på en kamp for å slå visning av/på. Du kan også markere valgte kamper som
                avlyst.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Lukk
            </button>
          </div>

          {isLoadingFixtures && selectedDayFixtures.length === 0 ? (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Laster kamper…</p>
          ) : selectedDayFixtures.length === 0 ? (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Ingen kamper denne dagen for de valgte ligaene.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedDayFixtures.map((f) => {
                const selected = selectedSet.has(f.id);
                const cancelled = cancelledSet.has(f.id);
                const comp = getCompetitionByKey(f.league);

                return (
                  <div
                    key={f.id}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {comp.label}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatKickoff(f.kickoffUtc)}
                        </span>
                        {cancelled && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
                            Avlyst
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {f.homeTeam} – {f.awayTeam}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleSelected(f.id)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {selected ? 'Vises' : 'Vis'}
                      </button>
                      <button
                        type="button"
                        disabled={!selected}
                        onClick={() => handleToggleCancelled(f.id)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                          cancelled
                            ? 'border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500 dark:text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {cancelled ? 'Avlyst' : 'Marker avlyst'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
	    </div>
	  );
	}

export default function BarFixturesPlannerPage() {
	return (
		<Suspense
			fallback={
				<div className="mx-auto max-w-6xl px-4 py-6 text-sm text-zinc-600 dark:text-zinc-300">
					Laster planlegger…
				</div>
			}
		>
			<BarFixturesPlannerPageInner />
		</Suspense>
	);
}
