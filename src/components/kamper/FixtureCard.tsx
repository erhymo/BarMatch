"use client";

import { MatchService } from "@/lib/services";
import type { Fixture } from "@/lib/types/fixtures";
import { LEAGUE_LABEL_BY_KEY } from "@/lib/hooks/useTeamSearch";

function formatTimeFromUtc(kickoffUtc: string, locale: string = "nb-NO"): string {
  const date = new Date(kickoffUtc);
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

interface FixtureCardProps {
  fixture: Fixture;
  isFavoriteMatch: boolean;
  favoriteTeamNameSet: Set<string>;
  isFirstOfDay: boolean;
  onClick: () => void;
}

export default function FixtureCard({
  fixture,
  isFavoriteMatch,
  favoriteTeamNameSet,
  isFirstOfDay,
  onClick,
}: FixtureCardProps) {
  const leagueLabel = LEAGUE_LABEL_BY_KEY[fixture.league];

  return (
    <div className="space-y-2">
      {isFirstOfDay && (
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {MatchService.formatDate(fixture.kickoffUtc)}
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">
              {formatTimeFromUtc(fixture.kickoffUtc)}
            </span>
            <span>
              {MatchService.getLeagueEmoji(leagueLabel)} {leagueLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
            <div className="flex items-center gap-1.5">
              {fixture.homeTeamLogoUrl && (
                <div className="h-5 w-5 sm:h-6 sm:w-6 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <img src={fixture.homeTeamLogoUrl} alt={fixture.homeTeam} loading="lazy" className="h-full w-full object-contain" />
                </div>
              )}
              <span className={favoriteTeamNameSet.has(fixture.homeTeam) ? "text-blue-600 dark:text-blue-400" : ""}>
                {fixture.homeTeam}
              </span>
            </div>
            <span className="mx-1 text-zinc-400">vs</span>
            <div className="flex items-center gap-1.5">
              {fixture.awayTeamLogoUrl && (
                <div className="h-5 w-5 sm:h-6 sm:w-6 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <img src={fixture.awayTeamLogoUrl} alt={fixture.awayTeam} loading="lazy" className="h-full w-full object-contain" />
                </div>
              )}
              <span className={favoriteTeamNameSet.has(fixture.awayTeam) ? "text-blue-600 dark:text-blue-400" : ""}>
                {fixture.awayTeam}
              </span>
            </div>
          </div>
        </div>

        {isFavoriteMatch && (
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
              <span>⭐</span>
              <span>Favorittlag</span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

