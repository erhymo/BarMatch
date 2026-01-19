'use client';

import { useMemo } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Match } from '@/lib/models';

interface BarMatchCalendarProps {
  matches: Match[];
  barId: string;
  onCancelMatch: (matchId: string) => void;
  cancelledMatchIds: string[];
}

// Placeholder function for notifying users
const notifyUsers = (matchId: string, barId: string) => {
  console.log(`[NOTIFY USERS] Match ${matchId} cancelled at bar ${barId}`);
  console.log(`Would send notifications to users who favorited this bar/match`);
  // In a real app, this would:
  // - Send push notifications
  // - Send emails
  // - Update user notifications in database
};

export default function BarMatchCalendar({
  matches,
  barId,
  onCancelMatch,
  cancelledMatchIds,
}: BarMatchCalendarProps) {
	  const { showToast } = useToast();

  // Sort matches by date and time
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [matches]);

  // Group matches by date
  const groupedMatches = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};

    sortedMatches.forEach((match) => {
      if (!groups[match.date]) {
        groups[match.date] = [];
      }
      groups[match.date].push(match);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedMatches]);

  const handleCancelMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const confirmMessage = `Er du sikker på at du vil avlyse kampen:\n${match.homeTeam.name} vs ${match.awayTeam.name}?\n\nBrukere som følger denne kampen vil bli varslet.`;
    
	    if (window.confirm(confirmMessage)) {
	      onCancelMatch(matchId);
	      notifyUsers(matchId, barId);
	      showToast({
	        title: 'Kamp avlyst',
	        description: `${match.homeTeam.name} – ${match.awayTeam.name} er markert som avlyst for baren din.`,
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

  const isCancelled = (matchId: string) => {
    return cancelledMatchIds.includes(matchId);
  };

  if (matches.length === 0) {
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
              {matches.length}
            </span>{' '}
            {matches.length === 1 ? 'kamp' : 'kamper'} totalt
          </p>
          {cancelledMatchIds.length > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {cancelledMatchIds.length} avlyst
            </p>
          )}
        </div>
      </div>

      {/* Matches grouped by date */}
      <div className="space-y-6">
        {groupedMatches.map(([date, dateMatches]) => (
          <div key={date} className="space-y-3">
            {/* Date Header */}
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
              {formatDate(date)}
            </h3>

            {/* Matches for this date */}
            <div className="space-y-2">
              {dateMatches.map((match) => {
                const cancelled = isCancelled(match.id);
                
                return (
                  <div
                    key={match.id}
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
                            {match.time}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded">
                            {match.competition}
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
                          {match.homeTeam.name} – {match.awayTeam.name}
                        </div>
                      </div>

                      {/* Cancel Button */}
                      {!cancelled && (
                        <button
                          onClick={() => handleCancelMatch(match.id)}
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

