'use client';

import { useMemo, useState } from 'react';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { COMPETITIONS, getCompetitionByKey } from '@/lib/config/competitions';

interface MatchSelectorProps {
  fixtures: Fixture[];
  selectedFixtureIds: string[];
  onFixtureSelectionChange: (fixtureIds: string[]) => void;
}

function formatDateFromUtc(kickoffUtc: string): string {
  const d = new Date(kickoffUtc);
  return d.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTimeFromUtc(kickoffUtc: string): string {
  const d = new Date(kickoffUtc);
  return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export default function MatchSelector({
  fixtures,
  selectedFixtureIds,
  onFixtureSelectionChange,
}: MatchSelectorProps) {
  const [selectedLeague, setSelectedLeague] = useState<LeagueKey | ''>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [query, setQuery] = useState<string>('');

  const selectedSet = useMemo(() => new Set(selectedFixtureIds), [selectedFixtureIds]);

  const teamOptions = useMemo(() => {
    const teams = new Set<string>();
    fixtures.forEach((f) => {
      teams.add(f.homeTeam);
      teams.add(f.awayTeam);
    });
    return Array.from(teams).sort((a, b) => a.localeCompare(b));
  }, [fixtures]);

  const filteredFixtures = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fixtures
      .filter((f) => (selectedLeague ? f.league === selectedLeague : true))
      .filter((f) => (selectedTeam ? f.homeTeam === selectedTeam || f.awayTeam === selectedTeam : true))
      .filter((f) => {
        if (!q) return true;
        return (
          f.homeTeam.toLowerCase().includes(q) ||
          f.awayTeam.toLowerCase().includes(q) ||
          getCompetitionByKey(f.league).label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
  }, [fixtures, query, selectedLeague, selectedTeam]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Fixture[]>();
    filteredFixtures.forEach((f) => {
      const key = f.kickoffUtc.slice(0, 10);
      const list = groups.get(key) ?? [];
      list.push(f);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredFixtures]);

  const toggleFixture = (fixtureId: string) => {
    const next = new Set(selectedSet);
    if (next.has(fixtureId)) next.delete(fixtureId);
    else next.add(fixtureId);
    onFixtureSelectionChange(Array.from(next));
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedSet);
    filteredFixtures.forEach((f) => next.add(f.id));
    onFixtureSelectionChange(Array.from(next));
  };

  const clearAll = () => {
    onFixtureSelectionChange([]);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Kampvalg</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Velg hvilke kamper baren din viser. Dette lagres lokalt (demo) per bar.
          </p>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Valgt: <span className="font-semibold">{selectedFixtureIds.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Liga</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague((e.target.value as LeagueKey) || '')}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="">Alle</option>
            {COMPETITIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Lag</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="">Alle</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Søk</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk i lag/liga..."
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={selectAllFiltered}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Velg alle filtrerte
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Fjern alle
        </button>
      </div>

      {/* List */}
      {fixtures.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Ingen fixtures lastet inn ennå.</p>
        </div>
      ) : groupedByDate.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Ingen kamper matcher filtrene.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByDate.map(([dateKey, list]) => (
            <div key={dateKey} className="space-y-2">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                {formatDateFromUtc(list[0]?.kickoffUtc ?? dateKey)}
              </h4>

              <div className="space-y-2">
                {list.map((f) => {
                  const checked = selectedSet.has(f.id);
                  const comp = getCompetitionByKey(f.league);
                  return (
                    <label
                      key={f.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        checked
                          ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFixture(f.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {formatTimeFromUtc(f.kickoffUtc)}
                          </span>
                          <span className="text-xs rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-200">
                            {comp.label}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {f.homeTeam} – {f.awayTeam}
                        </div>
                        {f.venue && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{f.venue}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
