'use client';

interface HomeHeaderProps {
  matchId: string | null;
  activeMatchDescription: string | null;
  selectedTeam: string | null;
  isCityPanelOpen: boolean;
  onToggleCityPanel: () => void;
  onClearMatchFilter: () => void;
}

export default function HomeHeader({
  matchId,
  activeMatchDescription,
  selectedTeam,
  isCityPanelOpen,
  onToggleCityPanel,
  onClearMatchFilter,
}: HomeHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-white/90 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Midten: Logo / kamp-info */}
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
                  onClick={onClearMatchFilter}
                  className="mt-1 inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  Fjern kampfilter
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-300 bg-clip-text text-transparent font-semibold tracking-tight text-lg md:text-2xl drop-shadow-sm">
                    where
                    <span className="font-black tracking-normal">2</span>
                    watch
                  </span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {selectedTeam
                    ? `Filter: ${selectedTeam}`
                    : 'Gå til «Kamper» for å søke etter lag og liga'}
                </div>
              </>
            )}
          </div>

          {/* Høyre: Lokasjon-knapp */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onToggleCityPanel}
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
    </div>
  );
}

