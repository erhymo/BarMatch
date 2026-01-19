'use client';

import { useState } from 'react';

interface TeamFilterProps {
  onTeamSelect: (teamId: string | null) => void;
}

const teams = [
  { id: 'tot', name: 'Tottenham' },
  { id: 'che', name: 'Chelsea' },
  { id: 'liv', name: 'Liverpool' },
  { id: 'mci', name: 'Manchester City' },
  { id: 'ars', name: 'Arsenal' },
  { id: 'mun', name: 'Manchester United' },
];

export default function TeamFilter({ onTeamSelect }: TeamFilterProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const handleTeamChange = (teamId: string) => {
    const newTeamId = teamId === '' ? null : teamId;
    setSelectedTeam(newTeamId);
    onTeamSelect(newTeamId);
  };

  return (
    <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
      <div className="container mx-auto flex items-center gap-4">
        <label 
          htmlFor="team-filter" 
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
        >
          Filtrer etter lag:
        </label>
        <select
          id="team-filter"
          value={selectedTeam || ''}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg 
                     bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     cursor-pointer"
        >
          <option value="">Alle barer</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        {selectedTeam && (
          <button
            onClick={() => handleTeamChange('')}
            className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
                       hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Nullstill
          </button>
        )}
      </div>
    </div>
  );
}

