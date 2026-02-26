'use client';

interface MapOverlaysProps {
  isLoadingBars: boolean;
  barsError: string | null;
  selectedTeam: string | null;
  matchId: string | null;
  filteredBarsCount: number;
}

export default function MapOverlays({
  isLoadingBars,
  barsError,
  selectedTeam,
  matchId,
  filteredBarsCount,
}: MapOverlaysProps) {
  return (
    <>
      {/* Loading state while fetching bars */}
      {isLoadingBars && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
            Laster barer…
          </div>
        </div>
      )}

      {/* Non-blocking warning if Firestore bars failed to load */}
      {barsError && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-amber-50/95 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 shadow-md text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium mb-1">Kunne ikke hente barer fra databasen.</p>
            <p className="text-xs opacity-90">Viser demo-barer midlertidig. ({barsError})</p>
          </div>
        </div>
      )}

      {/* Empty state when no bars match the current team filter */}
      {!isLoadingBars && selectedTeam && filteredBarsCount === 0 && (
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
      {!isLoadingBars && matchId && !selectedTeam && filteredBarsCount === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-md text-sm text-zinc-800 dark:text-zinc-100">
            <p className="font-medium mb-1">Ingen barer viser denne kampen akkurat nå.</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Prøv et annet lag, en annen liga eller fjern filtrene for å se flere barer.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

