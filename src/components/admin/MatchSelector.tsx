'use client';

import { useState, useMemo } from 'react';
import { Match } from '@/lib/models';
import { dummyMatches } from '@/lib/data/matches';

interface MatchSelectorProps {
  selectedMatchIds: string[];
  onMatchSelectionChange: (matchIds: string[]) => void;
}

export default function MatchSelector({
  selectedMatchIds,
  onMatchSelectionChange,
}: MatchSelectorProps) {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('');

  // Extract unique teams and leagues
  const { teams, leagues } = useMemo(() => {
    const teamSet = new Set<string>();
    const leagueSet = new Set<string>();

    dummyMatches.forEach((match) => {
      teamSet.add(match.homeTeam.id);
      teamSet.add(match.awayTeam.id);
      leagueSet.add(match.competition);
    });

    const teamsArray = Array.from(teamSet).map((id) => {
      const match = dummyMatches.find(
        (m) => m.homeTeam.id === id || m.awayTeam.id === id
      );
      return {
        id,
        name:
          match?.homeTeam.id === id
            ? match.homeTeam.name
            : match?.awayTeam.name || id,
      };
    });

    return {
      teams: teamsArray.sort((a, b) => a.name.localeCompare(b.name)),
      leagues: Array.from(leagueSet).sort(),
    };
  }, []);

  // Filter matches based on selected filters
  const filteredMatches = useMemo(() => {
    let matches = dummyMatches;

    if (selectedLeagueFilter) {
      matches = matches.filter((m) => m.competition === selectedLeagueFilter);
    }

    if (selectedTeamFilter) {
      matches = matches.filter(
        (m) =>
          m.homeTeam.id === selectedTeamFilter ||
          m.awayTeam.id === selectedTeamFilter
      );
    }

    return matches;
  }, [selectedLeagueFilter, selectedTeamFilter]);

  // Group matches by date and league
  const groupedMatches = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};

    filteredMatches.forEach((match) => {
      const key = `${match.date}-${match.competition}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(match);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMatches]);

  const toggleMatch = (matchId: string) => {
    const newSelection = selectedMatchIds.includes(matchId)
      ? selectedMatchIds.filter((id) => id !== matchId)
      : [...selectedMatchIds, matchId];
    onMatchSelectionChange(newSelection);
  };

  const selectAllTeamMatches = (teamId: string) => {
    const teamMatches = dummyMatches.filter(
      (m) => m.homeTeam.id === teamId || m.awayTeam.id === teamId
    );
    const teamMatchIds = teamMatches.map((m) => m.id);
    const allSelected = teamMatchIds.every((id) =>
      selectedMatchIds.includes(id)
    );

    if (allSelected) {
      // Deselect all team matches
      onMatchSelectionChange(
        selectedMatchIds.filter((id) => !teamMatchIds.includes(id))
      );
    } else {
      // Select all team matches
      const newSelection = [
        ...new Set([...selectedMatchIds, ...teamMatchIds]),
      ];
      onMatchSelectionChange(newSelection);
    }
  };

  const selectAllFilteredMatches = () => {
    const filteredIds = filteredMatches.map((m) => m.id);
    const allSelected = filteredIds.every((id) =>
      selectedMatchIds.includes(id)
    );

    if (allSelected) {
      onMatchSelectionChange(
        selectedMatchIds.filter((id) => !filteredIds.includes(id))
      );
    } else {
      const newSelection = [...new Set([...selectedMatchIds, ...filteredIds])];
      onMatchSelectionChange(newSelection);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* League Filter */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Filtrer etter liga
          </label>
          <select
            value={selectedLeagueFilter}
            onChange={(e) => setSelectedLeagueFilter(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                     bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Alle ligaer</option>
            {leagues.map((league) => (
              <option key={league} value={league}>
                {league}
              </option>
            ))}
          </select>
        </div>

        {/* Team Filter */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Filtrer etter lag
          </label>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                     bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Alle lag</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={selectAllFilteredMatches}
          className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50
                   text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
        >
          {filteredMatches.every((m) => selectedMatchIds.includes(m.id))
            ? 'Fjern alle filtrerte'
            : 'Velg alle filtrerte'}
        </button>

        {selectedTeamFilter && (
          <button
            onClick={() => selectAllTeamMatches(selectedTeamFilter)}
            className="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50
                     text-green-700 dark:text-green-300 rounded-lg transition-colors"
          >
            {dummyMatches
              .filter(
                (m) =>
                  m.homeTeam.id === selectedTeamFilter ||
                  m.awayTeam.id === selectedTeamFilter
              )
              .every((m) => selectedMatchIds.includes(m.id))
              ? `Fjern alle ${teams.find((t) => t.id === selectedTeamFilter)?.name}-kamper`
              : `Velg alle ${teams.find((t) => t.id === selectedTeamFilter)?.name}-kamper`}
          </button>
        )}

        {(selectedLeagueFilter || selectedTeamFilter) && (
          <button
            onClick={() => {
              setSelectedLeagueFilter('');
              setSelectedTeamFilter('');
            }}
            className="px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600
                     text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
          >
            Nullstill filtre
          </button>
        )}
      </div>

      {/* Match List */}
      <div className="space-y-6">
        {groupedMatches.length === 0 ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
            Ingen kamper funnet med valgte filtre
          </p>
        ) : (
          groupedMatches.map(([key, matches]) => {
            const [date, league] = key.split('-');
            return (
              <div key={key} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatDate(date)}
                  </h3>
                  <span className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full">
                    {league}
                  </span>
                </div>

                {/* Matches in Group */}
                <div className="space-y-2">
                  {matches.map((match) => (
                    <label
                      key={match.id}
                      className="flex items-center p-4 border border-zinc-200 dark:border-zinc-600 rounded-lg
                               hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMatchIds.includes(match.id)}
                        onChange={() => toggleMatch(match.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {match.homeTeam.name} vs {match.awayTeam.name}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {match.time}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {selectedMatchIds.length}
          </span>{' '}
          {selectedMatchIds.length === 1 ? 'kamp' : 'kamper'} valgt
        </p>
      </div>
    </div>
  );
}


