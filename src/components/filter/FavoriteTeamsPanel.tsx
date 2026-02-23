'use client';

import { useMemo, useState } from 'react';
import type { Fixture } from '@/lib/types/fixtures';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/contexts/ToastContext';

interface FavoriteTeamsPanelProps {
  fixtures: Fixture[];
  isLoadingFixtures: boolean;
}

const MAX_FAVORITE_TEAMS = 6;

export default function FavoriteTeamsPanel({
  fixtures,
  isLoadingFixtures,
}: FavoriteTeamsPanelProps) {
  const { favoriteTeams, toggleFavoriteTeam, isFavoriteTeam } = useFavorites();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');

  const allTeams = useMemo(() => {
    const set = new Set<string>();
    fixtures.forEach((fixture) => {
      if (fixture.homeTeam) set.add(fixture.homeTeam);
      if (fixture.awayTeam) set.add(fixture.awayTeam);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nb-NO'));
  }, [fixtures]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTeams;
    return allTeams.filter((name) => name.toLowerCase().includes(q));
  }, [allTeams, query]);

  const handleToggleFavorite = (teamName: string) => {
    const alreadyFavorite = isFavoriteTeam(teamName);
    if (!alreadyFavorite && favoriteTeams.length >= MAX_FAVORITE_TEAMS) {
	      showToast({
	        title: 'Maks antall favoritter',
	        description:
	          'Du kan bare ha 6 favorittlag. Fjern ett lag før du legger til et nytt.',
	        variant: 'info',
	      });
      return;
    }
    toggleFavoriteTeam(teamName);
  };

  const hasAnyTeams = allTeams.length > 0;

  return (
    <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-700/50 max-w-md w-full text-sm">
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-2xl">
              ⭐️
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Favorittlag</h2>
            <p className="text-xs text-zinc-400">
              Velg opptil {MAX_FAVORITE_TEAMS} lag du vil følge ekstra nøye.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-wide uppercase text-zinc-400">
              Dine favoritter
            </p>
            <p className="text-[11px] text-zinc-400">
              {favoriteTeams.length}/{MAX_FAVORITE_TEAMS}
            </p>
          </div>
          {favoriteTeams.length === 0 ? (
            <p className="text-[11px] text-zinc-500">
              Du har ingen favorittlag ennå. Søk etter lag under og legg dem til her.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {favoriteTeams.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => handleToggleFavorite(team)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-amber-500/15 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30"
                >
                  <span>{team}</span>
	                  <span className="text-[10px] opacity-80 group-hover:opacity-100">
	                    ×
	                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-medium text-zinc-300">
            Søk etter lag
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="F.eks. Rosenborg, Liverpool eller Barcelona"
            className="w-full rounded-lg border border-zinc-600/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide uppercase text-zinc-400">
            Foreslåtte lag
          </p>

          {!hasAnyTeams && (
            <p className="text-[11px] text-zinc-500">
              Vi fant ingen lag akkurat nå. Prøv igjen senere, eller gå til «Kamper» for å laste inn
              kamper.
            </p>
          )}

          {hasAnyTeams && filteredTeams.length === 0 && (
            <p className="text-[11px] text-zinc-500">Ingen lag matcher søket ditt.</p>
          )}

          {hasAnyTeams && filteredTeams.length > 0 && (
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {filteredTeams.map((team) => {
                const isFav = isFavoriteTeam(team);
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() => handleToggleFavorite(team)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      isFav
                        ? 'border-amber-400/80 bg-amber-500/20 text-amber-50'
                        : 'border-zinc-700/80 bg-zinc-900/40 text-zinc-100 hover:bg-zinc-800/70'
                    }`}
                  >
                    <span className="truncate">{team}</span>
                    <span className="ml-2 text-[10px] font-medium">{isFav ? 'Fjern' : 'Legg til'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isLoadingFixtures && (
            <p className="text-[11px] text-zinc-500">Laster inn lag fra kommende kamper…</p>
          )}
        </div>
      </div>
    </div>
  );
}

