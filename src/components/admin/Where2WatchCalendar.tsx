'use client';

import { useMemo } from 'react';
import { useToast } from '@/contexts/ToastContext';
import type { Fixture } from '@/lib/types/fixtures';
import { getCompetitionByKey } from '@/lib/config/competitions';

interface Where2WatchCalendarProps {
  fixtures: Fixture[];
  barId: string;
  onCancelFixture: (fixtureId: string) => void;
  cancelledFixtureIds: string[];
}

// Placeholder function for notifying users – implement real notifications her senere
const notifyUsers = (fixtureId: string, barId: string) => {
	  // Intentionally left as a no-op for now (kun dokumentasjon / placeholder).
	  void fixtureId;
	  void barId;
	  // I en ekte app kan dette f.eks.:
	  // - Sende push-varsler
	  // - Sende e-poster
	  // - Oppdatere brukervarsler i database
	};

export default function Where2WatchCalendar({
  fixtures,
  barId,
  onCancelFixture,
  cancelledFixtureIds,
}: Where2WatchCalendarProps) {
  const { showToast } = useToast();

  const sortedFixtures = useMemo(() => {
    return [...fixtures].sort(
      (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
    );
  }, [fixtures]);

  const groupedFixtures = useMemo(() => {
    const groups: { [key: string]: Fixture[] } = {};

    sortedFixtures.forEach((fixture) => {
      const dateKey = fixture.kickoffUtc.slice(0, 10);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(fixture);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedFixtures]);

  const handleCancelFixture = (fixtureId: string) => {
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return;

    const confirmMessage = `Er du sikker på at du vil avlyse kampen:\n${fixture.homeTeam} vs ${fixture.awayTeam}?\n\nBrukere som følger denne kampen vil bli varslet.`;

    if (window.confirm(confirmMessage)) {
      onCancelFixture(fixtureId);
      notifyUsers(fixtureId, barId);
      showToast({
        title: 'Kamp avlyst',
        description: `${fixture.homeTeam} – ${fixture.awayTeam} er markert som avlyst for baren din.`,
        variant: 'info',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isCancelled = (fixtureId: string) => {
    return cancelledFixtureIds.includes(fixtureId);
  };

  if (fixtures.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Ingen kamper valgt
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Gå til kampvalg-seksjonen for å velge kamper baren skal vise
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {fixtures.length}
            </span>{' '}
            {fixtures.length === 1 ? 'kamp' : 'kamper'} totalt
          </p>
          {cancelledFixtureIds.length > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {cancelledFixtureIds.length} avlyst
            </p>
          )}
        </div>
      </div>

      {/* Matches grouped by date */}
      <div className="space-y-6">
        {groupedFixtures.map(([date, dateFixtures]) => (
          <div key={date} className="space-y-3">
            {/* Date Header */}
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
              {formatDate(date)}
            </h3>

            {/* Matches for this date */}
            <div className="space-y-2">
              {dateFixtures.map((fixture) => {
                const cancelled = isCancelled(fixture.id);
                const competition = getCompetitionByKey(fixture.league);
                const kickoffTime = new Date(fixture.kickoffUtc).toLocaleTimeString('nb-NO', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                return (
                  <div
                    key={fixture.id}
                    className={`p-4 border rounded-lg transition-all ${
                      cancelled
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 opacity-75'
                        : 'border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Match Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {kickoffTime}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded">
                            {competition.label}
                          </span>
                          {cancelled && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded">
                              AVLYST
                            </span>
                          )}
                        </div>

                        <div className={`font-semibold text-lg ${
                          cancelled
                            ? 'text-zinc-500 dark:text-zinc-400 line-through'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {fixture.homeTeam} – {fixture.awayTeam}
                        </div>
                      </div>

                      {/* Cancel Button */}
                      {!cancelled && (
                        <button
                          onClick={() => handleCancelFixture(fixture.id)}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700
                                   dark:text-red-400 dark:hover:text-red-300
                                   hover:bg-red-50 dark:hover:bg-red-900/20
                                   border border-red-200 dark:border-red-800
                                   rounded-lg transition-colors"
                        >
                          Avlys
                        </button>
                      )}

                      {cancelled && (
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                          Avlyst
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

