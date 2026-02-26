"use client";

import type { Fixture } from "@/lib/types/fixtures";
import type { SearchSuggestion, TeamSuggestion, LeagueSuggestion } from "@/lib/hooks/useTeamSearch";

interface TeamSearchInputProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filteredTeamSuggestions: TeamSuggestion[];
  filteredLeagueSuggestions: LeagueSuggestion[];
  recentSuggestions: TeamSuggestion[];
  hasSuggestions: boolean;
  showRecent: boolean;
  isLoading: boolean;
  hasFixtures: boolean;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
}

export default function TeamSearchInput({
  searchQuery,
  onSearchQueryChange,
  filteredTeamSuggestions,
  filteredLeagueSuggestions,
  recentSuggestions,
  hasSuggestions,
  showRecent,
  isLoading,
  hasFixtures,
  onSelectSuggestion,
}: TeamSearchInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Søk etter lag eller liga
      </label>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder="F.eks. Rosenborg eller Premier League"
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      {searchQuery.trim().length > 0 && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Viser bare kamper som matcher søket ditt.
        </p>
      )}

      {/* Suggestions / recent searches */}
      <div className="mt-2 space-y-2">
        {showRecent ? (
          <div className="space-y-1">
            {recentSuggestions.map((s) => (
              <button
                key={`recent-${s.teamName}-${s.league}`}
                type="button"
                onClick={() => onSelectSuggestion(s)}
                className="w-full flex items-center justify-between rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/70 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-sm text-zinc-900 dark:text-zinc-100 transition-colors"
              >
                <span className="font-medium">{s.teamName}</span>
                <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {s.leagueLabel}
                </span>
              </button>
            ))}
          </div>
        ) : hasSuggestions ? (
          <div className="space-y-3">
            {filteredTeamSuggestions.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                  Lag
                </p>
                <div className="space-y-1">
                  {filteredTeamSuggestions.map((s) => (
                    <button
                      key={`team-${s.teamName}-${s.league}`}
                      type="button"
                      onClick={() => onSelectSuggestion(s)}
                      className="w-full flex items-center justify-between rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/70 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-sm text-zinc-900 dark:text-zinc-100 transition-colors"
                    >
                      <span className="font-medium">{s.teamName}</span>
                      <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {s.leagueLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredLeagueSuggestions.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                  Ligaer
                </p>
                <div className="space-y-1">
                  {filteredLeagueSuggestions.map((s) => (
                    <button
                      key={`league-${s.league}`}
                      type="button"
                      onClick={() => onSelectSuggestion(s)}
                      className="w-full flex items-center justify-between rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/70 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-sm text-zinc-900 dark:text-zinc-100 transition-colors"
                    >
                      <span className="font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !isLoading && hasFixtures && searchQuery.trim().length > 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ingen treff. Prøv et annet lag eller en annen liga.
          </p>
        ) : null}
      </div>
    </div>
  );
}

