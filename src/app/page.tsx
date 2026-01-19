	'use client';
	
	import { useMemo, useState } from 'react';
	import { useSearchParams } from 'next/navigation';
	import GoogleMap from '@/components/map/GoogleMap';
	import SportFilterPanel from '@/components/filter/SportFilterPanel';
	import BarDetailsPanel from '@/components/bar/BarDetailsPanel';
	import { dummyBars } from '@/lib/data/bars';
	import { Bar } from '@/lib/models';
	import { useBarFilter } from '@/lib/hooks';
	import { BarService } from '@/lib/services';
	
	export default function Home() {
	  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
	  const searchParams = useSearchParams();
	  const initialMatchId = searchParams.get('matchId');
	
	  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
	  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
	    initialMatchId
	  );
	  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
	
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
	
	  return (
	    <div className="flex flex-col h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
	      {/* Header Section */}
	      <div className="flex-shrink-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
	        <div className="container mx-auto px-4 py-6">
	          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
	            Finn din neste favorittbar
	          </h1>
	          <p className="text-sm text-zinc-600 dark:text-zinc-400">
	            Utforsk barer i nærheten og se hvor du kan se kommende kamper
	          </p>
	        </div>
	      </div>
	
	      {/* Map Section - Takes up remaining space */}
	      <div className="flex-1 relative overflow-hidden">
	        <div className="absolute inset-0">
	          <GoogleMap
	            apiKey={apiKey}
	            zoom={13}
	            useGeolocation={true}
	            bars={filteredBars}
	            onBarClick={handleBarClick}
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

	        {/* Sport Filter Panel - Overlay on map */}
	        <SportFilterPanel onTeamSelect={handleTeamSelect} />
	      </div>
	
	      {/* Bar Details Panel - Bottom sheet */}
	      <BarDetailsPanel bar={selectedBar} onClose={handleClosePanel} />
	    </div>
	  );
	}
	