'use client';

import { Bar } from '@/lib/models';
import { useFavorites } from '@/contexts/FavoritesContext';

interface BarDetailsPanelProps {
  bar: Bar | null;
  onClose: () => void;
}

export default function BarDetailsPanel({ bar, onClose }: BarDetailsPanelProps) {
  const { isFavoriteBar, toggleFavoriteBar } = useFavorites();

  if (!bar) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto transition-transform duration-300 ease-out">
        
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {bar.name}
                </h2>
                {isFavoriteBar(bar.id) && (
                  <span className="text-2xl">⭐</span>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                📍 {bar.address}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavoriteBar(bar.id);
                }}
                className={`p-2 rounded-full transition-all
                          ${
                            isFavoriteBar(bar.id)
                              ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500'
                              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500'
                          }`}
                title={isFavoriteBar(bar.id) ? 'Fjern fra favoritter' : 'Legg til i favoritter'}
              >
                <span className="text-2xl">
                  {isFavoriteBar(bar.id) ? '❤️' : '🤍'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <span className="text-2xl text-zinc-500">×</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${bar.position.lat},${bar.position.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                         text-white font-medium rounded-lg transition-colors text-center text-sm"
              >
                🗺️ Veibeskrivelse
              </a>
              <button
                onClick={onClose}
                className="px-4 py-3 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600
                         text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors text-sm"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

