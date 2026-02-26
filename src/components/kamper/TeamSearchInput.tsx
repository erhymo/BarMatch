"use client";

import type { TeamSuggestion } from "@/lib/hooks/useTeamSearch";

interface TeamSearchInputProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filteredTeamSuggestions: TeamSuggestion[];
  recentSuggestions: TeamSuggestion[];
  hasSuggestions: boolean;
  showRecent: boolean;
  isLoading: boolean;
  hasFixtures: boolean;
  onSelectSuggestion: (suggestion: TeamSuggestion) => void;
}

export default function TeamSearchInput({
  searchQuery,
  onSearchQueryChange,
  filteredTeamSuggestions,
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
        Søk etter lag
      </label>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder="F.eks. Rosenborg, AC Milan..."
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      {searchQuery.trim().length > 0 && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Viser bare kamper for valgt lag.
        </p>
      )}

      {/* Suggestions / recent searches */}
      <div className="mt-2 space-y-2">
        {showRecent ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
              Siste søk
            </p>
            <div className="space-y-1">
              {recentSuggestions.map((s) => (
                <button
                  key={`recent-team-${s.teamName}-${s.league}`}
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
        ) : hasSuggestions ? (
          <div>
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
        ) : !isLoading && hasFixtures && searchQuery.trim().length > 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ingen treff. Prøv et annet lag.
          </p>
        ) : null}
      </div>
    </div>
  );
}

