'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { dummyBars } from '@/lib/data/bars';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getFixtureProvider } from '@/lib/providers/fixtures';
import { BarFixtureSelectionService } from '@/lib/services';
import MatchSelector from '@/components/admin/MatchSelector';
import Where2WatchCalendar from '@/components/admin/Where2WatchCalendar';
import BarCampaignManager from '@/components/admin/BarCampaignManager';
import BarChatManager from '@/components/admin/BarChatManager';

const DEFAULT_RANGE_DAYS = 14;
const LEAGUES: LeagueKey[] = ['EPL', 'NOR_ELITESERIEN', 'SERIE_A', 'UCL'];

function createDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString();
  const toDate = new Date(now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  const to = toDate.toISOString();
  return { from, to };
}

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, currentBar } = useAuth();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);

  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);
  const [cancelledFixtureIds, setCancelledFixtureIds] = useState<string[]>([]);

  const range = useMemo(() => createDefaultRange(), []);
  const fixtureProvider = useMemo(() => getFixtureProvider(), []);

  const barId = useMemo(() => {
    if (currentBar?.id) return currentBar.id;
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('barId');
  }, [currentBar?.id]);

  const bar = useMemo(() => {
    if (!barId) return currentBar;
    return currentBar ?? dummyBars.find((b) => b.id === barId) ?? null;
  }, [barId, currentBar]);

  useEffect(() => {
    if (!barId || typeof window === 'undefined') return;
    setSelectedFixtureIds(BarFixtureSelectionService.loadSelectedFixtureIds(barId, window.localStorage));
    setCancelledFixtureIds(BarFixtureSelectionService.loadCancelledFixtureIds(barId, window.localStorage));
  }, [barId]);

  useEffect(() => {
    if (!barId || typeof window === 'undefined') return;
    BarFixtureSelectionService.saveSelectedFixtureIds(barId, selectedFixtureIds, window.localStorage);
  }, [barId, selectedFixtureIds]);

  useEffect(() => {
    if (!barId || typeof window === 'undefined') return;
    BarFixtureSelectionService.saveCancelledFixtureIds(barId, cancelledFixtureIds, window.localStorage);
  }, [barId, cancelledFixtureIds]);

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
          if (r.status === 'fulfilled') {
            all.push(...r.value);
          } else {
            console.error('[Admin] Fixture fetch failed:', r.reason);
          }
        });

        // De-dupe by id and sort
        const deduped = new Map<string, Fixture>();
        all.forEach((f) => deduped.set(f.id, f));
        const list = Array.from(deduped.values()).sort(
          (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
        );
        setFixtures(list);
      } catch (e) {
        if (cancelled) return;
        setFixturesError('Kunne ikke laste fixtures fra API.');
        console.error(e);
      } finally {
        if (!cancelled) setIsLoadingFixtures(false);
      }
    }

    // Only load when authenticated (to avoid unnecessary calls)
    if (isAuthenticated) {
      void loadFixtures();
    }

    return () => {
      cancelled = true;
    };
  }, [fixtureProvider, isAuthenticated, range.from, range.to]);

  const selectedFixtures = useMemo(() => {
    const set = new Set(selectedFixtureIds);
    return fixtures.filter((f) => set.has(f.id));
  }, [fixtures, selectedFixtureIds]);

  const handleCancelFixture = (fixtureId: string) => {
    setCancelledFixtureIds((prev) => (prev.includes(fixtureId) ? prev : [...prev, fixtureId]));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <main className="container mx-auto px-4 py-10 pb-24 max-w-2xl">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">Admin</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            Du må logge inn som bar-eier for å bruke admin.
          </p>

          <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 space-y-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors w-full"
            >
              Gå til bar-login
            </Link>

            <div className="flex gap-3">
              <Link
                href="/"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Tilbake til kartet
              </Link>
              <Link
                href="/kamper"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Se kamper
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!barId || !bar) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <main className="container mx-auto px-4 py-10 pb-24 max-w-2xl">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">Admin</h1>
          <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Fant ikke bar-profil for denne innloggingen. Prøv å logge ut og inn igjen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push('/min-bar')}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                Til Min bar
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-10 pb-24 max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Admin</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Administrer <span className="font-semibold">{bar.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/min-bar"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Min bar
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Kart
            </Link>
          </div>
        </div>

		{/* Fixtures status */}
		{(isLoadingFixtures || fixturesError) && (
		  <div className="mb-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
		    {isLoadingFixtures && (
		      <p className="text-sm text-zinc-600 dark:text-zinc-400">Laster fixtures fra API…</p>
		    )}
		    {fixturesError && (
		      <p className="text-sm text-red-600 dark:text-red-400">{fixturesError}</p>
		    )}
		  </div>
		)}
		
		{/* Calendar */}
        <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Kalender</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Oversikt over valgte kamper. Du kan markere en kamp som avlyst for baren.
          </p>
          <Where2WatchCalendar
            fixtures={selectedFixtures}
            barId={barId}
            onCancelFixture={handleCancelFixture}
            cancelledFixtureIds={cancelledFixtureIds}
          />
        </div>

        {/* Campaigns */}
        <div className="mt-6">
          <BarCampaignManager barId={barId} barName={bar.name} />
        </div>

        {/* Chat */}
        <div className="mt-6">
          <BarChatManager barId={barId} barName={bar.name} />
        </div>

		{/* Match selection */}
		<MatchSelector
		  fixtures={fixtures}
		  selectedFixtureIds={selectedFixtureIds}
		  onFixtureSelectionChange={setSelectedFixtureIds}
		/>
      </main>
    </div>
  );
}
