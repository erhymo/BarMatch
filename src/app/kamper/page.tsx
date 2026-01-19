	'use client';
	
	import { useMemo, useState } from 'react';
	import { useRouter } from 'next/navigation';
	import { dummyMatches } from '@/lib/data/matches';
	import { MatchService } from '@/lib/services';
	import { useFavorites } from '@/contexts/FavoritesContext';
	import { useLeagues } from '@/lib/hooks';
	
	export default function KamperPage() {
	  const router = useRouter();
	  const { favoriteTeams } = useFavorites();
	  const leagues = useLeagues(dummyMatches);
	  const [selectedLeague, setSelectedLeague] = useState<string>('');
	  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

	  const upcomingMatches = useMemo(
	    () => MatchService.getUpcomingMatches(dummyMatches),
	    []
	  );

	  const filteredMatches = useMemo(() => {
	    let matches = upcomingMatches;

	    if (selectedLeague) {
	      matches = matches.filter((m) => m.competition === selectedLeague);
	    }

	    if (showOnlyFavorites && favoriteTeams.length > 0) {
	      matches = matches.filter(
	        (m) =>
	          favoriteTeams.includes(m.homeTeam.id) ||
	          favoriteTeams.includes(m.awayTeam.id)
	      );
	    }

	    return matches;
	  }, [upcomingMatches, selectedLeague, showOnlyFavorites, favoriteTeams]);

	  const handleMatchClick = (matchId: string) => {
	    // Naviger til kartet og filtrer barer som viser denne kampen
	    router.push(`/?matchId=${matchId}`);
	  };

	  return (
	    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
	      <main className="container mx-auto px-4 py-8 pb-24">
	        <div className="max-w-4xl mx-auto space-y-8">
	          {/* Header */}
	          <header>
	            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
	              Kamper
	            </h1>
			    <p className="text-lg text-zinc-600 dark:text-zinc-400">
			      Se kommende kamper, filtrer på liga og fokuser på dine favorittlag.
			    </p>
	          </header>

	          {/* Filters */}
	          <section className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-sm p-4 sm:p-5">
	            <div className="flex flex-col gap-4">
	              {/* League filter */}
	              <div>
	                <div className="flex items-center justify-between mb-2">
	                  <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
	                    Liga
	                  </h2>
	                  {selectedLeague && (
	                    <button
	                      type="button"
	                      onClick={() => setSelectedLeague('')}
	                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
	                    >
	                      Nullstill
	                    </button>
	                  )}
	                </div>
	                <div className="flex flex-wrap gap-2">
	                  {leagues.map((league) => (
	                    <button
	                      key={league}
	                      type="button"
	                      onClick={() =>
	                        setSelectedLeague((prev) =>
	                          prev === league ? '' : league
	                        )
	                      }
	                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
	                        selectedLeague === league
	                          ? 'bg-blue-600 text-white border-blue-600'
	                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700'
	                      }`}
	                    >
	                      <span className="mr-1 text-base">
	                        {MatchService.getLeagueEmoji(league)}
	                      </span>
	                      {league}
	                    </button>
	                  ))}
	                </div>
	              </div>

	              {/* Favorites toggle */}
	              <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2.5">
	                <div>
	                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
	                    Favorittlag
	                  </p>
			          <p className="text-xs text-zinc-500 dark:text-zinc-400">
			            {favoriteTeams.length > 0
			              ? 'Vis bare kamper der dine lag spiller'
			              : 'Legg til favorittlag på forsiden for å bruke dette filteret'}
			          </p>
	                </div>
	                <button
	                  type="button"
	                  onClick={() => setShowOnlyFavorites((prev) => !prev)}
	                  disabled={favoriteTeams.length === 0}
	                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
	                    showOnlyFavorites && favoriteTeams.length > 0
	                      ? 'bg-blue-600 border-blue-600'
	                      : 'bg-zinc-200 border-zinc-300 dark:bg-zinc-700 dark:border-zinc-600'
	                  } ${
	                    favoriteTeams.length === 0
	                      ? 'opacity-40 cursor-not-allowed'
	                      : 'cursor-pointer'
	                  }`}
	                >
	                  <span
	                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
	                      showOnlyFavorites && favoriteTeams.length > 0
	                        ? 'translate-x-5'
	                        : 'translate-x-1'
	                    }`}
	                  />
	                </button>
	              </div>
	            </div>
	          </section>

	          {/* Match list */}
	          <section className="space-y-4">
	            {filteredMatches.length === 0 ? (
	              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 p-6 text-center">
	                <div className="mb-2 text-2xl">📅</div>
	                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
	                  Ingen kommende kamper matcher filtrene dine enn a.
	                </p>
	                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
	                  Endre liga, skru av favorittfilteret eller sjekk igjen litt senere.
	                </p>
	              </div>
			            ) : (
			              filteredMatches.map((match, index) => {
			                const prev = filteredMatches[index - 1];
			                const isFirstOfDay =
			                  index === 0 || prev?.date !== match.date;
			                const isFavoriteMatch =
			                  favoriteTeams.includes(match.homeTeam.id) ||
			                  favoriteTeams.includes(match.awayTeam.id);

			                return (
			                  <div key={match.id} className="space-y-2">
			                    {isFirstOfDay && (
			                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
			                        {MatchService.formatDate(match.date)}
			                      </div>
			                    )}
			                    <button
			                      type="button"
			                      onClick={() => handleMatchClick(match.id)}
			                      className="w-full rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
			                    >
			                      <div className="flex flex-col gap-1">
			                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
			                          <span className="font-semibold text-zinc-800 dark:text-zinc-100">
			                            {match.time}
			                          </span>
			                          <span>
			                            {MatchService.getLeagueEmoji(match.competition)}{' '}
			                            {match.competition}
			                          </span>
			                        </div>
			                        <div className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
			                          <span
			                            className={
			                              favoriteTeams.includes(match.homeTeam.id)
			                                ? 'text-blue-600 dark:text-blue-400'
			                                : ''
			                            }
			                          >
			                            {match.homeTeam.name}
			                          </span>
			                          <span className="mx-1 text-zinc-400">vs</span>
			                          <span
			                            className={
			                              favoriteTeams.includes(match.awayTeam.id)
			                                ? 'text-blue-600 dark:text-blue-400'
			                                : ''
			                            }
			                          >
			                            {match.awayTeam.name}
			                          </span>
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
			              })
			            )}
	          </section>
	        </div>
	      </main>
	    </div>
	  );
	}
	