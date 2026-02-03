'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  email?: string;
  selectedFixtureIds?: unknown;
  cancelledFixtureIds?: unknown;
};

function createDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString();
  const toDate = new Date(now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  const to = toDate.toISOString();
  return { from, to };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
}

function dateKeyFromUtcIso(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Ukjent dato';
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD in local time
}

function formatKickoff(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  // Local display, but derived from UTC ISO
  return dt.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BarFixturesPage() {
  const { showToast } = useToast();
  const { user, me } = useRequireAdminRole(['bar_owner']);

  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  const [selection, setSelection] = useState<{ selected: string[]; cancelled: string[] }>({
    selected: [],
    cancelled: [],
  });
	  const [activeLeagues, setActiveLeagues] = useState<LeagueKey[]>(LEAGUES);

  const range = useMemo(() => createDefaultRange(), []);
  const fixtureProvider = useMemo(() => getFixtureProvider(), []);

  // Load bar doc (incl. current selection)
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
        const cancelledIds = parseStringArray(data.cancelledFixtureIds).filter((id) => selected.includes(id));

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

  // Load upcoming fixtures for selection UI
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
          else console.error('[BarFixturesPage] Fixture fetch failed:', r.reason);
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

  const selectedSet = useMemo(() => new Set(selection.selected), [selection.selected]);
  const cancelledSet = useMemo(() => new Set(selection.cancelled), [selection.cancelled]);

	  const fixturesByDay = useMemo(() => {
	    const groups = new Map<string, Fixture[]>();
	    for (const f of fixtures) {
	      if (!activeLeagues.includes(f.league)) continue;
	      const k = dateKeyFromUtcIso(f.kickoffUtc);
	      const list = groups.get(k) ?? [];
	      list.push(f);
	      groups.set(k, list);
	    }
	    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
	  }, [fixtures, activeLeagues]);

  const missingSelectedCount = useMemo(() => {
    const fixtureIdSet = new Set(fixtures.map((f) => f.id));
    return selection.selected.filter((id) => !fixtureIdSet.has(id)).length;
  }, [fixtures, selection.selected]);

	  const selectedFixturesByDateKey = useMemo(() => {
	    const map = new Map<string, Fixture[]>();
	    for (const f of fixtures) {
	      if (!selectedSet.has(f.id) || cancelledSet.has(f.id)) continue;
	      const key = dateKeyFromUtcIso(f.kickoffUtc);
	      const list = map.get(key) ?? [];
	      list.push(f);
	      map.set(key, list);
	    }
	    map.forEach((list) => {
	      list.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
	    });
	    return map;
	  }, [fixtures, selectedSet, cancelledSet]);

	  const calendarDays = useMemo(() => {
	    const fromDate = new Date(range.from);
	    const toDate = new Date(range.to);
	    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];
	    const days: { key: string; date: Date }[] = [];
	    const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
	    // Safety guard on number of days
	    while (current <= toDate && days.length < 62) {
	      const date = new Date(current);
	      const year = date.getFullYear();
	      const month = String(date.getMonth() + 1).padStart(2, '0');
	      const day = String(date.getDate()).padStart(2, '0');
	      const key = `${year}-${month}-${day}`;
	      days.push({ key, date });
	      current.setDate(current.getDate() + 1);
	    }
	    return days;
	  }, [range.from, range.to]);

	  const todayKey = useMemo(() => {
	    const now = new Date();
	    const year = now.getFullYear();
	    const month = String(now.getMonth() + 1).padStart(2, '0');
	    const day = String(now.getDate()).padStart(2, '0');
	    return `${year}-${month}-${day}`;
	  }, []);

	  const allLeaguesSelected = activeLeagues.length === LEAGUES.length;

	  const toggleLeague = (league: LeagueKey) => {
	    setActiveLeagues((prev) =>
	      prev.includes(league) ? prev.filter((l) => l !== league) : [...prev, league],
	    );
	  };

	  const toggleAllLeagues = () => {
	    setActiveLeagues((prev) => (prev.length === LEAGUES.length ? [] : LEAGUES));
	  };

  const toggleSelected = (fixtureId: string) => {
    setSelection((prev) => {
      const selected = new Set(prev.selected);
      const cancelledIds = new Set(prev.cancelled);
      if (selected.has(fixtureId)) {
        selected.delete(fixtureId);
        cancelledIds.delete(fixtureId);
      } else {
        selected.add(fixtureId);
      }
      return { selected: Array.from(selected), cancelled: Array.from(cancelledIds) };
    });
  };

  const toggleCancelled = (fixtureId: string) => {
    setSelection((prev) => {
      if (!prev.selected.includes(fixtureId)) return prev; // only cancellable if selected
      const cancelledIds = new Set(prev.cancelled);
      if (cancelledIds.has(fixtureId)) cancelledIds.delete(fixtureId);
      else cancelledIds.add(fixtureId);
      return { ...prev, cancelled: Array.from(cancelledIds) };
    });
  };

  const save = async () => {
    if (!user || !me?.barId) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${me.barId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedFixtureIds: selection.selected,
          cancelledFixtureIds: selection.cancelled,
        }),
      });

      const raw: unknown = await res.json().catch(() => ({}));
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Failed to save (${res.status})`);
      }

      showToast({
        title: 'Lagret',
        description: 'Kampene er oppdatert.',
        variant: 'success',
      });
    } catch (e) {
      showToast({
        title: 'Feil',
        description: e instanceof Error ? e.message : 'Ukjent feil',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
	  };

	  const hasAnyFixtures = fixtures.length > 0;
	  const hasVisibleFixtures = fixturesByDay.length > 0;

	  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Velg kamper</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Velg hvilke kamper som skal vises på baren din (neste {DEFAULT_RANGE_DAYS} dager).
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Bar: <span className="font-medium">{bar?.name ?? '—'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/bar"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Tilbake
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Lagre
          </button>
        </div>
      </div>

	      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          valgte: {selection.selected.length}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          avlyst: {selection.cancelled.length}
        </span>
        {missingSelectedCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            obs: {missingSelectedCount} valgte kamper er utenfor datointervallet
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

	      {isLoadingFixtures && !hasAnyFixtures ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          Laster kamper…
        </div>
	      ) : !isLoadingFixtures && !hasAnyFixtures ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          Ingen kommende kamper i perioden.
        </div>
	      ) : !hasVisibleFixtures ? (
	        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
	          Ingen kamper for de valgte ligaene. Juster filteret over.
	        </div>
      ) : (
        <div className="space-y-5">
          {fixturesByDay.map(([day, items]) => (
            <section key={day} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{day}</h2>
              <div className="mt-3 space-y-2">
                {items.map((f) => {
                  const selected = selectedSet.has(f.id);
                  const cancelled = cancelledSet.has(f.id);
                  const comp = getCompetitionByKey(f.league);
                  return (
                    <div
                      key={f.id}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {comp.label}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatKickoff(f.kickoffUtc)}</span>
                          {cancelled && (
                            <span className="text-xs rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                              Avlyst
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                          {f.homeTeam} – {f.awayTeam}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelected(f.id)}
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
                          onClick={() => toggleCancelled(f.id)}
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
            </section>
          ))}
        </div>
      )}

	      {hasAnyFixtures && (
	        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
	          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Kalender: valgte kamper</h2>
	          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
	            Gir deg en enkel oversikt over kampene du har valgt per dag.
	          </p>
	          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-7">
	            {calendarDays.map(({ key, date }) => {
	              const dayFixtures = selectedFixturesByDateKey.get(key) ?? [];
	              const isToday = key === todayKey;
	              const dateLabel = date.toLocaleDateString(undefined, {
	                weekday: 'short',
	                day: '2-digit',
	                month: 'short',
	              });

	              return (
	                <div
	                  key={key}
	                  className={`flex flex-col rounded-xl border p-2 ${
	                    isToday
	                      ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/40'
	                      : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
	                  }`}
	                >
	                  <div className="flex items-baseline justify-between gap-1">
	                    <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
	                      {dateLabel}
	                    </span>
	                    {isToday && (
	                      <span className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-300">
	                        I dag
	                      </span>
	                    )}
	                  </div>

	                  {dayFixtures.length > 0 && (
	                    <div className="mt-1 space-y-0.5">
	                      {dayFixtures.slice(0, 3).map((f) => {
	                        const timeLabel = new Date(f.kickoffUtc).toLocaleTimeString(undefined, {
	                          hour: '2-digit',
	                          minute: '2-digit',
	                        });
	                        return (
	                          <div
	                            key={f.id}
	                            className="truncate text-[11px] text-zinc-800 dark:text-zinc-100"
	                          >
	                            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
	                              {timeLabel}
	                            </span>
	                            <span className="mx-1">·</span>
	                            <span className="font-medium">
	                              {f.homeTeam} – {f.awayTeam}
	                            </span>
	                          </div>
	                        );
	                      })}
	                      {dayFixtures.length > 3 && (
	                        <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
	                          +{dayFixtures.length - 3} flere kamper
	                        </div>
	                      )}
	                    </div>
	                  )}
	                </div>
	              );
	            })}
	          </div>
	        </section>
	      )}
    </div>
  );
}
