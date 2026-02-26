"use client";

import { MatchService } from "@/lib/services";
import type { LeagueKey } from "@/lib/types/fixtures";

const LEAGUES: { key: LeagueKey; label: string }[] = [
  { key: "EPL", label: "Premier League" },
  { key: "NOR_ELITESERIEN", label: "Eliteserien" },
  { key: "SERIE_A", label: "Serie A" },
  { key: "UCL", label: "UEFA Champions League" },
  { key: "UEL", label: "UEFA Europa League" },
];

interface LeagueFilterProps {
  selectedLeague: LeagueKey | "";
  onSelectLeague: (league: LeagueKey | "") => void;
}

export default function LeagueFilter({ selectedLeague, onSelectLeague }: LeagueFilterProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Liga
        </h2>
        {selectedLeague && (
          <button
            type="button"
            onClick={() => onSelectLeague("")}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Nullstill
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {LEAGUES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectLeague(selectedLeague === key ? "" : key)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
              selectedLeague === key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700"
            }`}
          >
            <span className="mr-1 text-base">
              {MatchService.getLeagueEmoji(label)}
            </span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

