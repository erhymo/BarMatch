'use client';

import { useMemo, useState } from 'react';
import { Bar } from '@/lib/models';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRatings } from '@/contexts/RatingsContext';
import { useToast } from '@/contexts/ToastContext';
import { useGoing } from '@/contexts/GoingContext';
import { BarService, MatchService } from '@/lib/services';
import { useCampaigns } from '@/lib/hooks';
import ChatPanel from '@/components/chat/ChatPanel';
import StarRating from '@/components/rating/StarRating';

interface BarDetailsPanelProps {
  bar: Bar | null;
  onClose: () => void;
}

export default function BarDetailsPanel({ bar, onClose }: BarDetailsPanelProps) {
  const { isFavoriteBar, toggleFavoriteBar } = useFavorites();
  const { getBarRating, getUserRatingForBar, rateBar } = useRatings();
	  const { showToast } = useToast();
		  const { getCampaignsForBar } = useCampaigns();
  const { getGoingStatusForMatch, toggleGoing } = useGoing();
  const [showChat, setShowChat] = useState(false);

  // Get today's day name using service
  const today = useMemo(() => MatchService.getTodayDayName(), []);

  // Get upcoming matches using service
  const upcomingMatches = useMemo(() => {
    if (!bar) return [];
    return BarService.getUpcomingMatches(bar);
  }, [bar]);

	  // Rating data
	  const barRating = bar ? getBarRating(bar.id) : null;
	  const userRating = bar ? getUserRatingForBar(bar.id) : null;
	  const averageRating = barRating?.averageRating ?? bar?.rating ?? 0;
	  const totalRatings = barRating?.totalRatings ?? (bar?.rating ? 1 : 0);

	  // Active campaigns for this bar
	  const activeCampaigns = bar
	    ? getCampaignsForBar(bar.id).filter((c) => c.isActive)
	    : [];

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

	          {/* Rating */}
	          <div className="mb-6 space-y-2">
            <StarRating
              value={averageRating}
              totalRatings={totalRatings}
              label="Gjennomsnitt"
              size="md"
            />
            <div className="flex items-center justify-between gap-2">
              <StarRating
                value={userRating?.rating ?? 0}
	                onChange={(rating) => {
	                  if (!bar) return;
	                  rateBar(bar.id, rating);
	                  showToast({
	                    title: 'Rating lagret',
	                    description: `Du har gitt ${bar.name} ${rating} stjerne${rating === 1 ? '' : 'r'}.`,
	                    variant: 'success',
	                  });
	                }}
                label="Din rating"
                size="sm"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Klikk for å gi 1–5 stjerner
              </span>
            </div>
          </div>

	          {/* Campaigns / Offers */}
	          {activeCampaigns.length > 0 && (
	            <div className="mb-6">
	              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2 flex items-center gap-2">
	                <span className="text-lg">🎉</span>
	                <span>Kampanjer & tilbud</span>
	              </h3>
	              <div className="space-y-2">
	                {activeCampaigns.map((campaign) => (
	                  <div
	                    key={campaign.id}
	                    className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg"
	                  >
	                    <p className="text-sm text-amber-900 dark:text-amber-100 mb-1">
	                      {campaign.text}
	                    </p>
	                    {campaign.tags && campaign.tags.length > 0 && (
	                      <div className="flex flex-wrap gap-1 mt-1">
	                        {campaign.tags.map((tag) => (
	                          <span
	                            key={tag}
	                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100"
	                          >
	                            #{tag}
	                          </span>
	                        ))}
	                      </div>
	                    )}
	                  </div>
	                ))}
	              </div>
	            </div>
	          )}

          {/* Description */}
          {bar.description && (
            <p className="text-zinc-700 dark:text-zinc-300 mb-6">
              {bar.description}
            </p>
          )}

          {/* Facilities */}
          {bar.facilities && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                Fasiliteter
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <span className="text-xl">📺</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {bar.facilities.screens} skjermer
                  </span>
                </div>
                {bar.facilities.hasFood && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <span className="text-xl">🍔</span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Mat
                    </span>
                  </div>
                )}
                {bar.facilities.hasOutdoorSeating && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <span className="text-xl">☀️</span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Uteservering
                    </span>
                  </div>
                )}
                {bar.facilities.hasWifi && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <span className="text-xl">📶</span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      WiFi
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {bar.openingHours && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                Åpningstider i dag
              </h3>
              <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">
                    {today.charAt(0).toUpperCase() + today.slice(1)}
                  </span>
                  <span className="text-sm font-bold text-green-900 dark:text-green-300">
                    {bar.openingHours[today as keyof typeof bar.openingHours] || 'Stengt'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Matches */}
          {upcomingMatches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                Kommende kamper ({upcomingMatches.length})
              </h3>
              <div className="space-y-2">
	                {upcomingMatches.slice(0, 5).map((match) => {
	                  const { count, isGoing } = getGoingStatusForMatch(bar.id, match.id);

	                  return (
	                    <div
	                      key={match.id}
	                      className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg
	                               border border-zinc-200 dark:border-zinc-700"
	                    >
	                      <div className="flex items-center justify-between mb-1">
	                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
	                          {MatchService.formatDate(match.date)} • {match.time}
	                        </span>
	                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30
	                                       text-blue-700 dark:text-blue-300 rounded font-medium">
	                          {match.competition}
	                        </span>
	                      </div>
	                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
	                        {match.homeTeam.name} – {match.awayTeam.name}
	                      </div>
	                      <div className="mt-2 flex items-center gap-2">
	                        <button
	                          type="button"
	                          onClick={() => toggleGoing(bar.id, match.id)}
	                          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
	                            isGoing
	                              ? 'bg-green-600 hover:bg-green-700 text-white'
	                              : 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100'
	                          }`}
	                        >
	                          Skal
	                        </button>
	                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
	                          {count}
	                        </span>
	                      </div>
	                    </div>
	                  );
	                })}
              </div>
            </div>
          )}

	          {upcomingMatches.length === 0 && (
	            <div className="mb-6">
	              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
	                Kommende kamper
	              </h3>
	              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
	                <p>Ingen kommende kamper er registrert for denne baren enn a.</p>
	                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
	                  Spors gjerne baren via meldingsknappen hvis du lurer paa om de viser en bestemt kamp.
	                </p>
	              </div>
	            </div>
	          )}

          {/* Contact */}
          {bar.phone && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                Kontakt
              </h3>
              <a
                href={`tel:${bar.phone}`}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800
                         rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <span className="text-xl">📞</span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {bar.phone}
                </span>
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowChat(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600
                       hover:from-green-600 hover:to-green-700
                       text-white font-medium rounded-lg transition-all text-sm shadow-lg
                       flex items-center justify-center gap-2"
            >
              <span className="text-lg">💬</span>
              Send melding / Book bord
            </button>

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

      {/* Chat Panel */}
      {showChat && (
        <ChatPanel
          barId={bar.id}
          barName={bar.name}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}

