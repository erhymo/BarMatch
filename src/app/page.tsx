		'use client';

		import { Suspense, useEffect, useMemo, useState } from 'react';
		import { useSearchParams } from 'next/navigation';
		import GoogleMap from '@/components/map/GoogleMap';
		import SportFilterPanel from '@/components/filter/SportFilterPanel';
		import CityFilterPanel from '@/components/filter/CityFilterPanel';
		import BarDetailsPanel from '@/components/bar/BarDetailsPanel';
		import { dummyBars } from '@/lib/data/bars';
		import { CITY_COORDINATES, type CityId } from '@/lib/data/cities';
		import { Bar } from '@/lib/models';
		import { useBarFilter } from '@/lib/hooks';
		import { BarService } from '@/lib/services';

	function HomeContent() {
	  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
	  const searchParams = useSearchParams();
	  const initialMatchId = searchParams.get('matchId');

		  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
		  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
		    initialMatchId
		  );
		  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
		  const [favoriteCity, setFavoriteCity] = useState<CityId | null>(() => {
		    if (typeof window === 'undefined') return null;
		    try {
		      const stored = window.localStorage.getItem('matchbar.favoriteCity');
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

	  // Lagre endringer i favoritt-by til localStorage
	  useEffect(() => {
	    if (typeof window === 'undefined') return;

	    try {
	      if (favoriteCity) {
	        window.localStorage.setItem('matchbar.favoriteCity', favoriteCity);
	      } else {
	        window.localStorage.removeItem('matchbar.favoriteCity');
	      }
	    } catch {
	      // Ignorer feil fra localStorage
	    }
	  }, [favoriteCity]);

		  // Nullstill lag- og kampfiltre når "Hjem" klikkes på nytt mens vi allerede er på forsiden
		  useEffect(() => {
		    if (typeof window === 'undefined') return;

		    const handleResetFilters = (_event: Event) => {
		      setSelectedTeam(null);
		      setSelectedMatchId(null);
		      setSelectedBar(null);
		      setIsFilterPanelOpen(false);
		      setIsCityPanelOpen(false);
		    };

		    window.addEventListener('barmatch:reset-home-filters', handleResetFilters);

		    return () => {
		      window.removeEventListener('barmatch:reset-home-filters', handleResetFilters);
		    };
		  }, []);

	  // Filter bars based on selected team using hook, then by match if valgt via Kamper-siden
	  const barsFilteredByTeam = useBarFilter(dummyBars, selectedTeam);
	  const filteredBars = useMemo(
	    () => BarService.filterBarsByMatch(barsFilteredByTeam, selectedMatchId),
	    [barsFilteredByTeam, selectedMatchId]
	  );

	  const handleTeamSelect = (teamId: string | null) => {
	    // Når brukeren velger lag på kartet, nullstiller vi evt. aktiv kamp-filter
	    setSelectedMatchId(null);
	    setSelectedTeam(teamId);
	  };

	  const handleBarClick = (bar: Bar) => {
	    setSelectedBar(bar);
	  };

	  const handleClosePanel = () => {
	    setSelectedBar(null);
	  };

		  const handleFavoriteCityChange = (city: CityId | null) => {
		    setFavoriteCity(city);
		  };

		  const toggleFilterPanel = () => {
		    setIsFilterPanelOpen((prev) => {
		      const next = !prev;
		      if (next) setIsCityPanelOpen(false);
		      return next;
		    });
		  };

		  const toggleCityPanel = () => {
		    setIsCityPanelOpen((prev) => {
		      const next = !prev;
		      if (next) setIsFilterPanelOpen(false);
		      return next;
		    });
		  };

		  const closePanels = () => {
		    setIsFilterPanelOpen(false);
		    setIsCityPanelOpen(false);
		  };

		  const mapCenter = favoriteCity ? CITY_COORDINATES[favoriteCity] : undefined;
		
		  return (
			    <div className="flex flex-col h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
			      {/* Header Section */}
			      <div className="flex-shrink-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
				        <div className="container mx-auto px-4 py-4">
				          <div className="flex items-center justify-between gap-3">
				            <button
				              type="button"
				              onClick={toggleFilterPanel}
				              className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl transition-colors ${
				                isFilterPanelOpen
				                  ? 'bg-green-500/20 border-green-400/70 text-green-300'
				                  : 'border-zinc-300/70 dark:border-zinc-600/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-700/60'
				              }`}
				              aria-label="Apne filter for liga og lag"
				            >
				              <span aria-hidden="true" className="text-xl">
				                ⚽
				              </span>
				            </button>
            <h1 className="flex-1 text-3xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50">
              Bar Match
            </h1>
				            <button
				              type="button"
				              aria-label="Velg sprak"
				              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg shadow-sm hover:bg-zinc-100 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
				            >
				              <span aria-hidden="true">🇬🇧</span>
				            </button>
				            <button
				              type="button"
				              onClick={toggleCityPanel}
				              className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl transition-colors ${
				                isCityPanelOpen
				                  ? 'bg-blue-500/20 border-blue-400/70 text-blue-300'
				                  : 'border-zinc-300/70 dark:border-zinc-600/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-700/60'
				              }`}
				              aria-label="Apne valg for by"
				            >
				              <span aria-hidden="true" className="text-xl">
				                🏙️
				              </span>
				            </button>
				          </div>
				        </div>
			      </div>
			
			      {/* Filter / City panels under header */}
			      {(isFilterPanelOpen || isCityPanelOpen) && (
			        <div className="flex-shrink-0 pt-1 pb-2">
			          <div className="container mx-auto px-4">
			            {isFilterPanelOpen && (
			              <SportFilterPanel onTeamSelect={handleTeamSelect} />
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
			            disableAutoPanToUser={Boolean(favoriteCity)}
			            bars={filteredBars}
			            onBarClick={handleBarClick}
			            onMapClick={() => {
			              if (isFilterPanelOpen || isCityPanelOpen) {
			                closePanels();
			              }
			            }}
			          />
			        </div>

		        {/* Empty state when no bars match the current team filter */}
	        {selectedTeam && filteredBars.length === 0 && (
	          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
	            <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
	              <p className="font-medium mb-1">
	                Ingen barer viser dette laget i naerheten akkurat naa.
	              </p>
	              <p className="text-xs text-zinc-600 dark:text-zinc-400">
	                Prov et annet lag, en annen liga eller fjern filtrene for a se flere barer.
	              </p>
	            </div>
	          </div>
	        )}

		        {/* Empty state when no bars match the current match filter */}
	        {selectedMatchId && filteredBars.length === 0 && (
	          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
	            <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
	              <p className="font-medium mb-1">
	                Ingen barer har registrert at de viser denne kampen ennå.
	              </p>
	              <p className="text-xs text-zinc-600 dark:text-zinc-400">
	                Sjekk igjen senere eller velg et lag i filteret for å se andre barer.
	              </p>
	            </div>
	          </div>
	        )}

		      </div>
		
		      {/* Bar Details Panel - Bottom sheet */}
		      <BarDetailsPanel bar={selectedBar} onClose={handleClosePanel} />
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
