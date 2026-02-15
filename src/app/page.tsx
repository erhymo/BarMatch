		'use client';

			import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
			import { useSearchParams, useRouter } from 'next/navigation';
		import GoogleMap from '@/components/map/GoogleMap';
		import SportFilterPanel from '@/components/filter/SportFilterPanel';
		import CityFilterPanel from '@/components/filter/CityFilterPanel';
		import BarDetailsPanel from '@/components/bar/BarDetailsPanel';
			import NearestBarListPanel from '@/components/bar/NearestBarListPanel';
		import { dummyBars } from '@/lib/data/bars';
		import { CITY_COORDINATES, type CityId } from '@/lib/data/cities';
		import { Bar } from '@/lib/models';
			import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
			import { getFixtureProvider } from '@/lib/providers/fixtures';
			import { getCompetitionByKey } from '@/lib/config/competitions';
			import { BarFixtureSelectionService, BarService } from '@/lib/services';

			const DEFAULT_RANGE_DAYS = 14;
			const LEAGUES: LeagueKey[] = ['EPL', 'NOR_ELITESERIEN', 'SERIE_A', 'UCL', 'UEL'];

			function createDefaultRange(days: number = DEFAULT_RANGE_DAYS): { from: string; to: string } {
			  const from = new Date();
			  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
			  return { from: from.toISOString(), to: to.toISOString() };
			}

		function HomeContent() {
			  const searchParams = useSearchParams();
			  const router = useRouter();
			  const matchId = searchParams.get('matchId');

		  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
			  const [selectedLeague, setSelectedLeague] = useState<LeagueKey>('EPL');
			  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
		  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
		  const [publicBars, setPublicBars] = useState<Bar[] | null>(null);
		  const [publicBarsError, setPublicBarsError] = useState<string | null>(null);
			  const [fixtures, setFixtures] = useState<Fixture[]>([]);
			  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
			  const [fixturesError, setFixturesError] = useState<string | null>(null);
			  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
			  const [mapFocusPosition, setMapFocusPosition] = useState<{ lat: number; lng: number } | null>(null);
		  const [favoriteCity, setFavoriteCity] = useState<CityId | null>(() => {
		    if (typeof window === 'undefined') return null;
		    try {
			      const stored = window.localStorage.getItem('where2watch.favoriteCity');
		      if (
		        stored === 'oslo' ||
		        stored === 'bergen' ||
		        stored === 'forde' ||
		        stored === 'trondheim'
		      ) {
		        return stored as CityId;
		      }
		    } catch {
		      // Ignorer feil fra localStorage
		    }
		    return null;
		  });
		  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
		  const [isCityPanelOpen, setIsCityPanelOpen] = useState(false);
			  const [isNearestListOpen, setIsNearestListOpen] = useState(false);

			  const range = useMemo(() => createDefaultRange(DEFAULT_RANGE_DAYS), []);
			  const fixtureProvider = useMemo(() => getFixtureProvider(), []);

			  const loadFixtures = useCallback(async () => {
			    setIsLoadingFixtures(true);
			    setFixturesError(null);
			    try {
			      const results = await Promise.allSettled(
			        LEAGUES.map((league) => fixtureProvider.getUpcomingFixtures(league, range.from, range.to)),
			      );

			      const all: Fixture[] = [];
			      let anyRejected = false;
			      results.forEach((r) => {
			        if (r.status === 'fulfilled') {
			          all.push(...r.value);
			        } else {
			          anyRejected = true;
			          console.error('[Home] Fixture fetch failed:', r.reason);
			        }
			      });

			      const deduped = new Map<string, Fixture>();
			      all.forEach((f) => deduped.set(f.id, f));

			      const list = Array.from(deduped.values()).sort(
			        (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
			      );
			      setFixtures(list);

			      if (list.length === 0 && anyRejected) {
			        setFixturesError('Kunne ikke laste kamper akkurat nå.');
			      }
			    } catch (e) {
			      setFixturesError(e instanceof Error ? e.message : 'Kunne ikke laste kamper');
			    } finally {
			      setIsLoadingFixtures(false);
			    }
			  }, [fixtureProvider, range.from, range.to]);

			  // Load fixtures on-demand when user opens filter panel
			  useEffect(() => {
			    if (!isFilterPanelOpen) return;
			    if (fixtures.length > 0) return;
			    if (isLoadingFixtures) return;
			    void loadFixtures();
			  }, [isFilterPanelOpen, fixtures.length, isLoadingFixtures, loadFixtures]);

				  // Ensure fixtures are loaded when coming from /kamper with a specific matchId
				  useEffect(() => {
				    if (!matchId) return;
				    if (fixtures.length > 0) return;
				    if (isLoadingFixtures) return;
				    void loadFixtures();
				  }, [matchId, fixtures.length, isLoadingFixtures, loadFixtures]);

			  // Migrate legacy key (matchbar.favoriteCity) -> where2watch.favoriteCity
			  useEffect(() => {
			    if (typeof window === 'undefined') return;
			    try {
			      const legacy = window.localStorage.getItem('matchbar.favoriteCity');
			      if (!legacy) return;

			      const isValidLegacyCity =
			        legacy === 'oslo' ||
			        legacy === 'bergen' ||
			        legacy === 'forde' ||
			        legacy === 'trondheim';

			      if (isValidLegacyCity) {
			        // Only set state if we don't already have a valid value from the new key.
			        setFavoriteCity((current) => (current ? current : (legacy as CityId)));
			      }

			      // Clean up legacy key either way (we never read it elsewhere anymore).
			      window.localStorage.removeItem('matchbar.favoriteCity');
			    } catch {
			      // ignore
			    }
			  }, []);

		  // Load visible bars from Firestore via public API.
		  // If it fails, we fall back to dummy bars (non-blocking warning).
		  useEffect(() => {
		    let cancelled = false;
		    const run = async () => {
		      try {
		        setPublicBarsError(null);
		        const res = await fetch('/api/bars');
		        if (!res.ok) throw new Error(`Failed to load bars (${res.status})`);
		        const data = (await res.json()) as { bars?: Bar[] };
		        if (!cancelled) {
		          setPublicBars(Array.isArray(data.bars) ? data.bars : []);
		        }
		      } catch (e) {
		        if (!cancelled) {
		          setPublicBars(null);
		          setPublicBarsError(e instanceof Error ? e.message : 'Failed to load bars');
		        }
		      }
		    };
		    void run();
		    return () => {
		      cancelled = true;
		    };
		  }, []);

	  // Lagre endringer i favoritt-by til localStorage
	  useEffect(() => {
	    if (typeof window === 'undefined') return;

	    try {
	      if (favoriteCity) {
		        window.localStorage.setItem('where2watch.favoriteCity', favoriteCity);
	      } else {
		        window.localStorage.removeItem('where2watch.favoriteCity');
	      }
	    } catch {
	      // Ignorer feil fra localStorage
	    }
	  }, [favoriteCity]);

		  // Nullstill lag- og kampfiltre når "Hjem" klikkes på nytt mens vi allerede er på forsiden
		  useEffect(() => {
		    if (typeof window === 'undefined') return;

			  const handleResetFilters = () => {
			      setSelectedLeague('EPL');
		      setSelectedTeam(null);
		      setSelectedBar(null);
			      setMapFocusPosition(null);
		      setIsFilterPanelOpen(false);
		      setIsCityPanelOpen(false);
		    };

		    window.addEventListener('where2watch:reset-home-filters', handleResetFilters);

		    return () => {
		      window.removeEventListener('where2watch:reset-home-filters', handleResetFilters);
		    };
		  }, []);

		  const isLoadingPublicBars = publicBars === null && !publicBarsError;
		  const baseBars = useMemo(() => {
		    if (publicBarsError) return dummyBars;
		    if (publicBars === null) return [];
		    return publicBars;
		  }, [publicBars, publicBarsError]);

			  // Enrich bars with localStorage selection when Firestore selection is missing.
			  const barsWithSelection = useMemo(() => {
			    if (typeof window === 'undefined') return baseBars;
			    return baseBars.map((bar) => {
			      const hasSelected = Array.isArray(bar.selectedFixtureIds);
			      const hasCancelled = Array.isArray(bar.cancelledFixtureIds);
			      if (hasSelected || hasCancelled) return bar;

			      try {
			        const selectedFixtureIds = BarFixtureSelectionService.loadSelectedFixtureIds(bar.id, window.localStorage);
			        const cancelledFixtureIds = BarFixtureSelectionService.loadCancelledFixtureIds(bar.id, window.localStorage);
			        if (selectedFixtureIds.length === 0 && cancelledFixtureIds.length === 0) return bar;
			        return { ...bar, selectedFixtureIds, cancelledFixtureIds };
			      } catch {
			        return bar;
			      }
			    });
			  }, [baseBars]);

			  const selectedTeamFixtureIds = useMemo(() => {
			    if (!selectedTeam) return null;
			    const set = new Set<string>();
			    fixtures
			      .filter((f) => f.league === selectedLeague)
			      .forEach((f) => {
			        if (f.homeTeam === selectedTeam || f.awayTeam === selectedTeam) {
			          set.add(f.id);
			        }
			      });
			    return set;
			  }, [fixtures, selectedLeague, selectedTeam]);

			  const barsFilteredByTeam = useMemo(() => {
			    if (!selectedTeam) return barsWithSelection;
			    if (!selectedTeamFixtureIds) return barsWithSelection;
			    if (selectedTeamFixtureIds.size === 0) return [];
			    return BarService.filterBarsByFixtureIds(barsWithSelection, selectedTeamFixtureIds);
			  }, [barsWithSelection, selectedTeam, selectedTeamFixtureIds]);

			  // If navigated from /kamper (/?matchId=...), filter to bars that have selected that fixture.
			  const filteredBars = useMemo(() => {
			    if (!matchId) return barsFilteredByTeam;
			    const matchIdSet = new Set([matchId]);
			    return barsFilteredByTeam.filter((bar) =>
			      BarService.matchesFixtureFilterFromArrays({
			        fixtureFilterIds: matchIdSet,
			        selectedFixtureIds: bar.selectedFixtureIds,
			        cancelledFixtureIds: bar.cancelledFixtureIds,
			      }),
			    );
			  }, [barsFilteredByTeam, matchId]);

				  const activeMatch = useMemo(() => {
				    if (!matchId) return null;
				    if (!fixtures || fixtures.length === 0) return null;
				    const found = fixtures.find((f) => f.id === matchId);
				    return found ?? null;
				  }, [fixtures, matchId]);

					  const activeMatchDescription = useMemo(() => {
					    if (!activeMatch) return null;
					    const dt = new Date(activeMatch.kickoffUtc);
					    const date = dt.toLocaleDateString('nb-NO', {
					      weekday: 'short',
					      day: 'numeric',
					      month: 'short',
					    });
					    const time = dt.toLocaleTimeString('nb-NO', {
					      hour: '2-digit',
					      minute: '2-digit',
					    });
					    return `${activeMatch.homeTeam} - ${activeMatch.awayTeam}, ${date} kl. ${time}`;
					  }, [activeMatch]);

					const handleClearMatchFilter = () => {
					  router.push('/');
					};
				
					const handleTeamSelect = (teamName: string | null) => {
		  setSelectedTeam(teamName);
		};

		const handleLeagueChange = (league: LeagueKey) => {
		  setSelectedLeague(league);
		  setSelectedTeam(null);
		};

		  const ensureFixturesLoaded = useCallback(() => {
		    if (fixtures.length > 0) return;
		    if (isLoadingFixtures) return;
		    void loadFixtures();
		  }, [fixtures.length, isLoadingFixtures, loadFixtures]);

		  const handleBarClick = (bar: Bar) => {
		    ensureFixturesLoaded();
		    setSelectedBar(bar);
		    setIsNearestListOpen(false);
		  };

	  const handleClosePanel = () => {
	    setSelectedBar(null);
	  };

		  const handleFavoriteCityChange = (city: CityId | null) => {
		    setFavoriteCity(city);
			    // Når bruker velger en eksplisitt by, nullstiller vi fokus på enkeltbar
			    // slik at kartet følger by-valget i stedet for forrige "finn nærmeste bar".
			    setMapFocusPosition(null);
		  };

			  const leagueOptions = useMemo(() => {
			    return LEAGUES.map((key) => ({ key, label: getCompetitionByKey(key).label }));
			  }, []);

		  const toggleFilterPanel = () => {
		    setIsFilterPanelOpen((prev) => {
		      const next = !prev;
			      if (next) {
			        setIsCityPanelOpen(false);
			        setIsNearestListOpen(false);
			      }
		      return next;
		    });
		  };

		  const toggleCityPanel = () => {
		    setIsCityPanelOpen((prev) => {
		      const next = !prev;
			      if (next) {
			        setIsFilterPanelOpen(false);
			        setIsNearestListOpen(false);
			      }
		      return next;
		    });
		  };

				  const closePanels = useCallback(() => {
				    setIsFilterPanelOpen(false);
				    setIsCityPanelOpen(false);
				  }, []);

				  const closeOverlays = useCallback(() => {
				    closePanels();
				    setIsNearestListOpen(false);
				  }, [closePanels]);

				  const handleFindNearestBar = useCallback(() => {
				    // UX: Button opens a distance-sorted list. Selection is the 2nd click.
				    closePanels();
				    setSelectedBar(null);
				    setMapFocusPosition(null);
				    setIsNearestListOpen(true);
				  }, [closePanels]);

		  const mapCenter = favoriteCity ? CITY_COORDINATES[favoriteCity] : undefined;
		
		  return (
			    <div className="flex flex-col h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
			      {/* Header Section */}
				      <div className="flex-shrink-0 bg-white/90 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
				        <div className="container mx-auto px-4 py-4">
				          <div className="flex items-center justify-between gap-3">
					          <button
					            type="button"
					            onClick={toggleFilterPanel}
					            className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
					                isFilterPanelOpen
					                  ? 'border-emerald-500 text-emerald-700 dark:border-emerald-400 dark:text-emerald-200'
					                  : 'border-zinc-300/70 dark:border-zinc-600/80 text-zinc-700 dark:text-zinc-200'
					              }`}
					            aria-label="Åpne søk etter lag og liga"
					          >
				              <span className="text-xs font-medium tracking-tight">Søk</span>
				            </button>
		            <div className="flex-1 text-center">
					              {matchId ? (
					                <div className="space-y-1">
					                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
					                    Filtrerer på kamp
					                  </div>
					                  <div className="text-xs text-zinc-700 dark:text-zinc-300">
					                    {activeMatchDescription ? (
					                      <>
					                        Viser barer som viser:{' '}
					                        <span className="font-medium">{activeMatchDescription}</span>
					                      </>
					                    ) : (
					                      'Viser barer som viser valgt kamp.'
					                    )}
					                  </div>
					                  <button
					                    type="button"
					                    onClick={handleClearMatchFilter}
					                    className="mt-1 inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
					                  >
					                    Fjern kampfilter
					                  </button>
					                </div>
					              ) : (
					                <>
					                  <div className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
					                    <span className="bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-[0.18em] text-[0.78rem] md:text-xs">
					                      where2watch
					                    </span>
					                  </div>
					                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
					                    {selectedTeam ? `Filter: ${selectedTeam}` : 'Bruk søk for å filtrere på lag eller liga'}
					                  </div>
					                </>
					              )}
		            </div>
					          <button
					            type="button"
					            onClick={toggleCityPanel}
					              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
					                isCityPanelOpen
					                  ? 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-200'
					                  : 'border-zinc-300/70 dark:border-zinc-600/80 text-zinc-700 dark:text-zinc-200'
					              }`}
					              aria-label="Åpne valg for lokasjon"
					          >
					              <span className="text-xs font-medium tracking-tight">Lokasjon</span>
				            </button>
				          </div>
				        </div>
			      </div>
			
			      {/* Filter / City panels under header */}
			      {(isFilterPanelOpen || isCityPanelOpen) && (
			        <div className="flex-shrink-0 pt-1 pb-2">
			          <div className="container mx-auto px-4">
			            {isFilterPanelOpen && (
			              <SportFilterPanel
			                leagues={leagueOptions}
			                selectedLeague={selectedLeague}
			                selectedTeam={selectedTeam}
			                fixtures={fixtures}
			                onLeagueChange={handleLeagueChange}
			                onTeamSelect={handleTeamSelect}
			                isLoading={isLoadingFixtures}
			                error={fixturesError}
			                onRetryLoad={loadFixtures}
			                onDone={() => setIsFilterPanelOpen(false)}
			              />
			            )}
			            {isCityPanelOpen && (
			              <CityFilterPanel
			                favoriteCity={favoriteCity}
			                onFavoriteCityChange={handleFavoriteCityChange}
			              />
			            )}
			          </div>
			        </div>
			      )}
			
			      {/* Map Section - Takes up remaining space */}
			      <div className="flex-1 relative overflow-hidden">
			        <div className="absolute inset-0">
			          <GoogleMap
			            apiKey={apiKey}
			            center={mapCenter}
			            zoom={13}
			            useGeolocation={true}
				            // Hvis bruker har valgt en favorittby, eller vi har eksplisitt fokus
				            // (f.eks. fra "Finn nærmeste bar"), lar vi ikke geolokasjon
				            // overstyre kart-senteret.
				            disableAutoPanToUser={Boolean(favoriteCity) || Boolean(mapFocusPosition)}
			            focusPosition={mapFocusPosition}
			            focusZoom={15}
			            onUserPositionChange={setUserPosition}
			            bars={filteredBars}
			            onBarClick={handleBarClick}
			            onMapClick={() => {
				              if (isFilterPanelOpen || isCityPanelOpen || isNearestListOpen) {
				                closeOverlays();
				              }
			            }}
			          />
			        </div>

				        {/* Nearest list (bottom sheet) */}
				        {isNearestListOpen && (
				          <NearestBarListPanel
				            bars={filteredBars}
				            userPosition={userPosition}
				            onClose={() => setIsNearestListOpen(false)}
				            onSelectBar={(bar) => {
				              ensureFixturesLoaded();
				              setSelectedBar(bar);
				              setMapFocusPosition(bar.position);
				              setIsNearestListOpen(false);
				            }}
				          />
				        )}
				
 					        {/* Active match filter banner when navigated from /kamper (moved to header) */}

			        {/* Find nearest bar */}
					<div className="pointer-events-none absolute bottom-20 md:bottom-4 right-4 flex flex-col items-end gap-2 px-4">
			          <button
			            type="button"
			            onClick={handleFindNearestBar}
			            className="pointer-events-auto rounded-full bg-zinc-900/90 hover:bg-zinc-900 text-white text-sm font-medium px-4 py-2 shadow-lg border border-white/10 disabled:opacity-50"
			            disabled={filteredBars.length === 0}
			          >
			            Finn nærmeste bar
			          </button>
			        </div>

					{/* Loading state while fetching bars */}
					{isLoadingPublicBars && (
					  <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
					    <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
					      Laster barer…
					    </div>
					  </div>
					)}

					{/* Non-blocking warning if Firestore bars failed to load (we fall back to dummy bars) */}
					{publicBarsError && (
					  <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
					    <div className="pointer-events-auto max-w-md rounded-xl bg-amber-50/95 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 shadow-md text-sm text-amber-900 dark:text-amber-200">
					      <p className="font-medium mb-1">Kunne ikke hente barer fra databasen.</p>
					      <p className="text-xs opacity-90">Viser demo-barer midlertidig. ({publicBarsError})</p>
					    </div>
					  </div>
					)}

						{/* Empty state when no bars match the current team filter */}
						{!isLoadingPublicBars && selectedTeam && filteredBars.length === 0 && (
	          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
	            <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
	              <p className="font-medium mb-1">
			              Ingen barer viser dette laget i nærheten akkurat nå.
	              </p>
	              <p className="text-xs text-zinc-600 dark:text-zinc-400">
			              Prøv et annet lag, en annen liga eller fjern filtrene for å se flere barer.
	              </p>
	            </div>
	          </div>
	        )}

					{/* Empty state when navigated via matchId */}
						{!isLoadingPublicBars && matchId && !selectedTeam && filteredBars.length === 0 && (
		          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
		            <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
		              <p className="font-medium mb-1">Ingen barer viser denne kampen akkurat nå.</p>
		              <p className="text-xs text-zinc-600 dark:text-zinc-400">
			                Prøv et annet lag, en annen liga eller fjern filtrene for å se flere barer.
		              </p>
		            </div>
		          </div>
		        )}

		      </div>
		
				      {/* Bar Details Panel - Bottom sheet */}
				      {selectedBar && (
				        <BarDetailsPanel
				          bar={selectedBar}
				          userPosition={userPosition}
				          fixtures={fixtures}
				          isLoadingFixtures={isLoadingFixtures}
				          fixturesError={fixturesError}
				          onRetryLoadFixtures={loadFixtures}
				          onClose={handleClosePanel}
				        />
				      )}
		    </div>
	  );
	}

	export default function Home() {
	  return (
	    <Suspense
	      fallback={
	        <div className="flex h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black text-zinc-500 dark:text-zinc-400">
	          Laster inn siden...
	        </div>
	      }
	    >
	      <HomeContent />
	    </Suspense>
	  );
	}
