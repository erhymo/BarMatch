'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GoogleMap from '@/components/map/GoogleMap';
import CityFilterPanel from '@/components/filter/CityFilterPanel';
import FavoriteTeamsPanel from '@/components/filter/FavoriteTeamsPanel';
import BarDetailsPanel from '@/components/bar/BarDetailsPanel';
import NearestBarListPanel from '@/components/bar/NearestBarListPanel';
import HomeHeader from '@/components/home/HomeHeader';
import MapOverlays from '@/components/home/MapOverlays';
import { CITY_COORDINATES, type CityId } from '@/lib/data/cities';
import { Bar } from '@/lib/models';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getFixtureProvider } from '@/lib/providers/fixtures';
import { ALL_LEAGUE_KEYS } from '@/lib/config/competitions';
import { BarFixtureSelectionService, BarService } from '@/lib/services';
import { usePublicBars } from '@/lib/hooks/usePublicBars';
import { useCandidateBars } from '@/lib/hooks/useCandidateBars';
import { useFavoriteCity } from '@/lib/hooks/useFavoriteCity';
import { useTabletLandscapeLayout } from '@/lib/hooks/useTabletLandscapeLayout';
import { useTranslation } from '@/lib/i18n';

const DEFAULT_RANGE_DAYS = 14;
const LEAGUES: LeagueKey[] = ALL_LEAGUE_KEYS;

			function createDefaultRange(days: number = DEFAULT_RANGE_DAYS): { from: string; to: string } {
			  const from = new Date();
			  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
			  return { from: from.toISOString(), to: to.toISOString() };
			}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const matchId = searchParams.get('matchId');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [selectedLeague, setSelectedLeague] = useState<LeagueKey>('EPL');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapFocusPosition, setMapFocusPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapViewportCenter, setMapViewportCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [isCityPanelOpen, setIsCityPanelOpen] = useState(false);
  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);
  const [isNearestListOpen, setIsNearestListOpen] = useState(false);
  const isTabletLandscape = useTabletLandscapeLayout();

  // Extracted hooks
  const { bars: baseBars, isLoading: isLoadingPublicBars, error: publicBarsError } = usePublicBars();
  const { favoriteCity, setFavoriteCity } = useFavoriteCity();

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
			        setFixturesError(t('home_could_not_load'));
			      }
			    } catch (e) {
			      setFixturesError(e instanceof Error ? e.message : t('home_could_not_load_generic'));
			    } finally {
			      setIsLoadingFixtures(false);
			    }
			  }, [fixtureProvider, range.from, range.to, t]);

				  // Ensure fixtures are loaded when coming from /kamper with a specific matchId
				  useEffect(() => {
				    if (!matchId) return;
				    if (fixtures.length > 0) return;
				    if (isLoadingFixtures) return;
				    void loadFixtures();
				  }, [matchId, fixtures.length, isLoadingFixtures, loadFixtures]);

  // Legacy migration is now handled by useFavoriteCity hook
			
				  // Velg sentrum for automatisk søk etter "hvite" sportsbarer (Google Places):
				  // foretrinnsvis favoritt-by, ellers brukerposisjon hvis tilgjengelig.
				  const sportsbarSearchCenter = useMemo(() => {
				    if (favoriteCity) {
				      return CITY_COORDINATES[favoriteCity];
				    }
				    if (userPosition) {
				      return userPosition;
				    }
				    return null;
				  }, [favoriteCity, userPosition]);

				  // Hold aktuell kart-sentrumsposisjon for søk etter hvite sportsbarer.
				  // Startes fra sportsbarSearchCenter, men oppdateres når brukeren flytter kartet.
				  useEffect(() => {
				    if (!sportsbarSearchCenter) return;
				    setMapViewportCenter(sportsbarSearchCenter);
				  }, [sportsbarSearchCenter]);

  // Public bars fetching and localStorage persistence are now handled by usePublicBars and useFavoriteCity hooks.
  // Candidate bars (hvite baller) are loaded via useCandidateBars hook.
  const candidateBars = useCandidateBars(mapViewportCenter, mapZoom);

			  // Nullstill lag- og kampfiltre når "Hjem" klikkes på nytt mens vi allerede er på forsiden
			  useEffect(() => {
			    if (typeof window === 'undefined') return;
			
					  const handleResetFilters = () => {
					      setSelectedLeague('EPL');
				      setSelectedTeam(null);
				      setSelectedBar(null);
					      setMapFocusPosition(null);
				      setIsCityPanelOpen(false);
				      setIsFavoritesPanelOpen(false);
				      setIsNearestListOpen(false);
				    };
			
			    window.addEventListener('where2watch:reset-home-filters', handleResetFilters);
			
			    return () => {
			      window.removeEventListener('where2watch:reset-home-filters', handleResetFilters);
			    };
			  }, []);

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

			  // Barer som vises på kartet:
			  // - Ved kamp/lag-filter viser vi kun partner-barer (filteredBars).
			  // - Ellers legger vi til eksterne sportsbarer (candidateBars) som hvite baller.
			  const mapBars = useMemo(() => {
			    if (matchId || selectedTeam) {
			      return filteredBars;
			    }
			    if (!candidateBars.length) {
			      return filteredBars;
			    }

			    const partnerPlaceIds = new Set(
			      filteredBars
			        .map((bar) => bar.googlePlaceId)
			        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
			    );

			    // Dedup thresholds (in km):
			    // - Innenfor 50m: alltid duplikat (samme sted)
			    // - Innenfor 150m + identisk navn: duplikat (inngang på annen side av bygning)
			    const CLOSE_KM = 0.05;
			    const NAME_MATCH_KM = 0.15;

			    const extraCandidates = candidateBars.filter((bar) => {
			      // 1) Exact googlePlaceId match
			      if (bar.googlePlaceId && partnerPlaceIds.has(bar.googlePlaceId)) {
			        return false;
			      }
			      // 2) Proximity-based dedup
			      const candidateName = bar.name.trim().toLowerCase();
			      for (const partner of filteredBars) {
			        const dist = BarService.calculateDistance(partner.position, bar.position);
			        // Veldig nær → alltid duplikat
			        if (dist < CLOSE_KM) return false;
			        // Innenfor 150m med identisk navn → duplikat
			        if (dist < NAME_MATCH_KM && partner.name.trim().toLowerCase() === candidateName) {
			          return false;
			        }
			      }
			      return true;
			    });

			    if (!extraCandidates.length) {
			      return filteredBars;
			    }

			    return [...filteredBars, ...extraCandidates];
			  }, [candidateBars, filteredBars, matchId, selectedTeam]);

				  const activeMatch = useMemo(() => {
				    if (!matchId) return null;
				    if (!fixtures || fixtures.length === 0) return null;
				    const found = fixtures.find((f) => f.id === matchId);
				    return found ?? null;
				  }, [fixtures, matchId]);

					  const activeMatchDescription = useMemo(() => {
					    if (!activeMatch) return null;
					    const dt = new Date(activeMatch.kickoffUtc);
					    const dateLocale = t('date_locale');
					    const date = dt.toLocaleDateString(dateLocale, {
					      weekday: 'short',
					      day: 'numeric',
					      month: 'short',
					    });
					    const time = dt.toLocaleTimeString(dateLocale, {
					      hour: '2-digit',
					      minute: '2-digit',
					    });
					    return `${activeMatch.homeTeam} - ${activeMatch.awayTeam}, ${date} ${t('time_at')} ${time}`;
			  }, [activeMatch, t]);

					const handleClearMatchFilter = () => {
					  router.push('/');
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
				
				  const toggleCityPanel = () => {
				    setIsCityPanelOpen((prev) => {
				      const next = !prev;
						      if (next) {
						        setIsNearestListOpen(false);
						        setIsFavoritesPanelOpen(false);
						      }
				      return next;
				    });
				  };
				
						  const closePanels = useCallback(() => {
						    setIsCityPanelOpen(false);
						    setIsFavoritesPanelOpen(false);
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
				
				  const handleMapViewportChange = useCallback((center: { lat: number; lng: number }, z?: number) => {
				    setMapViewportCenter(center);
				    if (typeof z === 'number') setMapZoom(z);
				  }, []);

		  const mapCenter = favoriteCity ? CITY_COORDINATES[favoriteCity] : undefined;
		  const shouldShiftNearestButton = isTabletLandscape && (isNearestListOpen || Boolean(selectedBar));
		
		  return (
			    <div className="home-screen-shell flex flex-col bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        {/* Header Section */}
        <HomeHeader
          matchId={matchId}
          activeMatchDescription={activeMatchDescription}
          selectedTeam={selectedTeam}
          isCityPanelOpen={isCityPanelOpen}
          onToggleCityPanel={toggleCityPanel}
          onClearMatchFilter={handleClearMatchFilter}
        />
			
					      {/* City panel under header */}
					      {isFavoritesPanelOpen && (
					        <div className="flex-shrink-0 pt-1 pb-2">
					          <div className="container mx-auto px-4">
					            <FavoriteTeamsPanel fixtures={fixtures} isLoadingFixtures={isLoadingFixtures} />
					          </div>
					        </div>
					      )}
					
					      {isCityPanelOpen && (
					        <div className="flex-shrink-0 pt-1 pb-2">
					          <div className="container mx-auto px-4">
					            <CityFilterPanel
					              favoriteCity={favoriteCity}
					              onFavoriteCityChange={handleFavoriteCityChange}
					            />
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
				            onViewportChange={handleMapViewportChange}
				            bars={mapBars}
			            onBarClick={handleBarClick}
					            onMapClick={() => {
						              if (isCityPanelOpen || isNearestListOpen) {
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
					<div
					  className="pointer-events-none absolute bottom-20 right-4 flex flex-col items-end gap-2 px-4 transition-[right] duration-300 md:bottom-4"
					  style={shouldShiftNearestButton ? { right: 'calc(min(32rem, 42vw) + 1.5rem)' } : undefined}
					>
			          <button
			            type="button"
			            onClick={handleFindNearestBar}
			            className="pointer-events-auto rounded-full bg-zinc-900/90 hover:bg-zinc-900 text-white text-sm font-medium px-4 py-2 shadow-lg border border-white/10 disabled:opacity-50"
			            disabled={filteredBars.length === 0}
			          >
			            {t('home_find_nearest_bar')}
			          </button>
			        </div>

        <MapOverlays
          isLoadingBars={isLoadingPublicBars}
          barsError={publicBarsError}
          selectedTeam={selectedTeam}
          matchId={matchId}
          filteredBarsCount={filteredBars.length}
        />

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
		        <div className="home-screen-shell flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black text-zinc-500 dark:text-zinc-400">
	          Loading...
	        </div>
	      }
	    >
	      <HomeContent />
	    </Suspense>
	  );
	}
