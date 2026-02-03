'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Bar, Position } from '@/lib/models';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRatings } from '@/contexts/RatingsContext';
import { useToast } from '@/contexts/ToastContext';
import { useCampaigns } from '@/lib/hooks';
import StarRating from '@/components/rating/StarRating';
import ChatPanel from '@/components/chat/ChatPanel';
import type { Fixture } from '@/lib/types/fixtures';
import { getCompetitionByKey } from '@/lib/config/competitions';
import { BarFixtureSelectionService, BarService } from '@/lib/services';

function formatFixtureDateTime(kickoffUtc: string): string {
  const d = new Date(kickoffUtc);
  const date = d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function isPastCutoff(kickoffUtc: string, cutoffMinutes: number = 90): boolean {
  const kickoffMs = new Date(kickoffUtc).getTime();
  const cutoffMs = kickoffMs + cutoffMinutes * 60 * 1000;
  return Date.now() > cutoffMs;
}

interface BarDetailsPanelProps {
  bar: Bar;
  userPosition: Position | null;
  fixtures: Fixture[];
  isLoadingFixtures: boolean;
  fixturesError: string | null;
  onRetryLoadFixtures: () => void;
  onClose: () => void;
}

export default function BarDetailsPanel({
  bar,
  userPosition,
  fixtures,
  isLoadingFixtures,
  fixturesError,
  onRetryLoadFixtures,
  onClose,
}: BarDetailsPanelProps) {
  const { isFavoriteBar, toggleFavoriteBar } = useFavorites();
  const { getBarRating, getUserRatingForBar, rateBar, clearRatingForBar } = useRatings();
  const { showToast } = useToast();
  const { getCampaignsForBar } = useCampaigns();

  const [showChat, setShowChat] = useState(false);

  const todayKey = useMemo(() => {
    // Date.getDay(): 0=sunday .. 6=saturday
    const dayKeys: Array<
      'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
    > = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayKeys[new Date().getDay()];
  }, []);

  // Prefer persisted fixture selection (from Firestore via /api/bars) when available.
  // Fallback is localStorage for demo/dev data.
  const selectedFixtureIds = useMemo(() => {
    const persistedSelected = Array.isArray(bar.selectedFixtureIds)
      ? bar.selectedFixtureIds.filter((v): v is string => typeof v === 'string')
      : null;
    if (persistedSelected) return persistedSelected;
    if (typeof window === 'undefined') return [];
    return BarFixtureSelectionService.loadSelectedFixtureIds(bar.id, window.localStorage);
  }, [bar.id, bar.selectedFixtureIds]);

  const cancelledFixtureIds = useMemo(() => {
    const persistedCancelled = Array.isArray(bar.cancelledFixtureIds)
      ? bar.cancelledFixtureIds.filter((v): v is string => typeof v === 'string')
      : null;
    if (persistedCancelled) return persistedCancelled;
    if (typeof window === 'undefined') return [];
    return BarFixtureSelectionService.loadCancelledFixtureIds(bar.id, window.localStorage);
  }, [bar.id, bar.cancelledFixtureIds]);

  const activeSelectedFixtureIds = useMemo(() => {
    const selectedSet = new Set(selectedFixtureIds);
    cancelledFixtureIds.forEach((id) => selectedSet.delete(id));
    return Array.from(selectedSet);
  }, [cancelledFixtureIds, selectedFixtureIds]);

  const selectedFixtures: Fixture[] = useMemo(() => {
    const selectedSet = new Set(activeSelectedFixtureIds);
    return fixtures
      .filter((f) => selectedSet.has(f.id))
      .filter((f) => !isPastCutoff(f.kickoffUtc, 90))
      .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
  }, [activeSelectedFixtureIds, fixtures]);

  const { todayFixtures, upcomingFixtures } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const todayMs = todayStart.getTime();
    const tomorrowMs = tomorrowStart.getTime();

    const todayFixtures = selectedFixtures.filter((f) => {
      const kickoff = new Date(f.kickoffUtc).getTime();
      return kickoff >= todayMs && kickoff < tomorrowMs;
    });

    const upcomingFixtures = selectedFixtures.filter((f) => {
      const kickoff = new Date(f.kickoffUtc).getTime();
      return kickoff >= tomorrowMs;
    });

    return { todayFixtures, upcomingFixtures };
  }, [selectedFixtures]);

  const distanceLabel = useMemo(() => {
    if (!userPosition) return null;
    const km = BarService.calculateDistance(userPosition, bar.position);
    return BarService.formatDistance(km);
  }, [bar.position, userPosition]);

  const storedBarRating = getBarRating(bar.id);
  const userRating = getUserRatingForBar(bar.id);
  const displayRatingValue = storedBarRating?.averageRating ?? bar.rating ?? 0;
  const displayTotalRatings = storedBarRating?.totalRatings;

  const activeCampaigns = getCampaignsForBar(bar.id).filter((c) => c.isActive);

	  const hasSpecialOffers =
	    typeof bar.specialOffers === 'string' && bar.specialOffers.trim().length > 0;

	  const facilities = bar.facilities;
	  const screensLabel =
	    typeof facilities?.screens === 'number' && Number.isFinite(facilities.screens)
	      ? facilities.screens <= 2
	        ? '1-2 skjermer'
	        : facilities.screens <= 5
	          ? '3-5 skjermer'
	          : '6+ skjermer'
	      : 'Ikke oppgitt';

	  const foodDetails: string[] = [];
	  if (facilities?.servesWarmFood) foodDetails.push('Varm mat');
	  if (facilities?.servesSnacks) foodDetails.push('Snacks / småretter');
	  if (facilities?.hasVegetarianOptions) foodDetails.push('Vegetar/vegansk');
	  const foodLabel =
	    foodDetails.length > 0
	      ? foodDetails.join(' • ')
	      : facilities?.hasFood === true
	        ? 'Serverer mat'
	        : facilities?.hasFood === false
	          ? 'Serverer ikke mat'
	          : 'Ikke oppgitt';

	  const facilityBadges: string[] = [];
	  if (facilities?.hasOutdoorSeating) facilityBadges.push('🌤️ Uteservering');
	  if (facilities?.hasWifi) facilityBadges.push('📶 Gratis WiFi');
	  if (facilities?.familyFriendly) facilityBadges.push('👨‍👩‍👧 Familievennlig før kl. 21');
	  if (facilities?.canReserveTable) facilityBadges.push('📅 Reservasjon til kamp');
	  if (facilities?.hasProjector) facilityBadges.push('📽️ Projektor');

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
                📍 {bar.address ?? 'Adresse ikke tilgjengelig'}
              </p>
              {distanceLabel && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mt-1">
                  🧭 {distanceLabel} unna
                </p>
              )}
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
                onClick={() => setShowChat(true)}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600
                         text-white font-medium rounded-lg transition-colors text-sm"
              >
                💬 Send melding
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {bar.phone ? (
                <a
                  href={`tel:${bar.phone}`}
                  className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700
                           text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors text-center text-sm"
                >
                  📞 Ring
                </a>
              ) : (
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700
                                text-zinc-500 dark:text-zinc-400 font-medium rounded-lg text-center text-sm">
                  📞 Ingen telefon
                </div>
              )}

              <button
                onClick={onClose}
                className="px-4 py-3 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600
                         text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors text-sm"
              >
                Lukk
              </button>
            </div>
          </div>

          {/* Rating */}
          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Vurdering
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {displayTotalRatings
                    ? `${displayRatingValue.toFixed(1)} ★ (${displayTotalRatings})`
                    : displayRatingValue
                    ? `${displayRatingValue.toFixed(1)} ★`
                    : 'Ingen vurderinger enda'}
                </p>
              </div>
              {userRating && (
                <button
                  type="button"
                  onClick={() => {
                    clearRatingForBar(bar.id);
                    showToast({
                      title: 'Vurdering fjernet',
                      description: 'Din vurdering er fjernet.',
                      variant: 'info',
                    });
                  }}
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline"
                >
                  Fjern min vurdering
                </button>
              )}
            </div>

            <div className="mt-3">
              <StarRating
                value={displayRatingValue}
                totalRatings={displayTotalRatings}
                onChange={(rating) => {
                  rateBar(bar.id, rating);
                  showToast({
                    title: 'Takk!',
                    description: `Du ga ${bar.name} ${rating} stjerner.`,
                    variant: 'success',
                  });
                }}
                label={userRating ? `Din vurdering: ${userRating.rating}★` : 'Gi din vurdering'}
                size="md"
              />
            </div>
          </div>

	          {/* Campaigns & bar offers */}
	          <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
	            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
	              Kampanjer & tilbud
	            </h3>
	            {hasSpecialOffers && (
	              <div className="mb-3 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
	                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200 mb-1">
	                  Fast fra baren
	                </p>
	                <p className="text-sm text-emerald-900 dark:text-emerald-50 whitespace-pre-line">
	                  {bar.specialOffers}
	                </p>
	              </div>
	            )}
	            {activeCampaigns.length === 0 && !hasSpecialOffers ? (
	              <p className="text-sm text-zinc-600 dark:text-zinc-400">
	                Ingen kampanjer eller tilbud er registrert enda.
	              </p>
	            ) : activeCampaigns.length > 0 ? (
	              <div className="space-y-3">
	                {activeCampaigns.map((campaign) => (
	                  <div
	                    key={campaign.id}
	                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4"
	                  >
	                    <p className="text-sm text-zinc-900 dark:text-zinc-50">
	                      {campaign.text}
	                    </p>
	                    {campaign.tags && campaign.tags.length > 0 && (
	                      <div className="mt-2 flex flex-wrap gap-2">
	                        {campaign.tags.map((tag) => (
	                          <span
	                            key={`${campaign.id}-${tag}`}
	                            className="inline-flex items-center rounded-full bg-blue-600/10 dark:bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-200"
	                          >
	                            {tag}
	                          </span>
	                        ))}
	                      </div>
	                    )}
	                  </div>
	                ))}
	              </div>
	            ) : null}
	          </div>

          {/* Matches this bar shows (based on bar's fixture selections) */}
          <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Kamper</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
	                  Vises basert på hva baren har registrert at de viser.
                </p>
              </div>
              <Link
                href="/kamper"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Se alle
              </Link>
            </div>

            {isLoadingFixtures && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Laster kamper…</p>
            )}

            {fixturesError && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-4">
                <p className="text-sm text-red-700 dark:text-red-300">{fixturesError}</p>
                <button
                  type="button"
                  onClick={onRetryLoadFixtures}
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Prøv igjen
                </button>
              </div>
            )}

            {!isLoadingFixtures && !fixturesError && activeSelectedFixtureIds.length === 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Denne baren har ikke satt opp kamper enda.
                </p>
              </div>
            )}

            {!isLoadingFixtures && !fixturesError && activeSelectedFixtureIds.length > 0 && selectedFixtures.length === 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Ingen kamper akkurat nå (eller de er passert 90-minutters cutoff).
                </p>
              </div>
            )}

            {!isLoadingFixtures && !fixturesError && selectedFixtures.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">I dag</h4>
                  {todayFixtures.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Ingen kamper i dag.</p>
                  ) : (
                    <div className="space-y-2">
                      {todayFixtures.slice(0, 6).map((f) => {
                        const competition = getCompetitionByKey(f.league);
                        return (
                          <div
                            key={f.id}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatFixtureDateTime(f.kickoffUtc)}
                              </span>
                              <span className="text-xs rounded bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-200">
                                {competition.label}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {f.homeTeam} – {f.awayTeam}
                            </div>
                            {f.venue && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">{f.venue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Kommende</h4>
                  {upcomingFixtures.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Ingen kommende kamper.</p>
                  ) : (
                    <div className="space-y-2">
                      {upcomingFixtures.slice(0, 8).map((f) => {
                        const competition = getCompetitionByKey(f.league);
                        return (
                          <div
                            key={f.id}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatFixtureDateTime(f.kickoffUtc)}
                              </span>
                              <span className="text-xs rounded bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-200">
                                {competition.label}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {f.homeTeam} – {f.awayTeam}
                            </div>
                            {f.venue && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">{f.venue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Om baren
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {bar.description ?? 'Ingen beskrivelse lagt til enda.'}
            </p>
          </div>

	          {/* Facilities */}
	          {bar.facilities && (
	            <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
	              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
	                Fasiliteter
	              </h3>

	              <div className="grid grid-cols-2 gap-3">
	                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-3">
	                  <p className="text-xs text-zinc-500 dark:text-zinc-400">📺 Skjermer</p>
	                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
	                    {screensLabel}
	                  </p>
	                </div>
	                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-3">
	                  <p className="text-xs text-zinc-500 dark:text-zinc-400">🍔 Mat</p>
	                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
	                    {foodLabel}
	                  </p>
	                </div>
	                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-3">
	                  <p className="text-xs text-zinc-500 dark:text-zinc-400">🌤️ Uteservering</p>
	                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
	                    {bar.facilities.hasOutdoorSeating ? 'Ja' : 'Nei'}
	                  </p>
	                </div>
	                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-3">
	                  <p className="text-xs text-zinc-500 dark:text-zinc-400">📶 WiFi</p>
	                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
	                    {bar.facilities.hasWifi ? 'Ja' : 'Nei'}
	                  </p>
	                </div>
	              </div>

	              {typeof bar.facilities.capacity === 'number' && (
	                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
	                  👥 Kapasitet: {bar.facilities.capacity}
	                </p>
	              )}

	              {facilityBadges.length > 0 && (
	                <div className="mt-3 flex flex-wrap gap-2">
	                  {facilityBadges.map((label) => (
	                    <span
	                      key={label}
	                      className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-100"
	                    >
	                      {label}
	                    </span>
	                  ))}
	                </div>
	              )}
	            </div>
	          )}

          {/* Opening hours */}
          {bar.openingHours && (
            <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                Åpningstider
              </h3>
              <div className="space-y-2">
                {(
                  [
                    { key: 'monday', label: 'Mandag' },
                    { key: 'tuesday', label: 'Tirsdag' },
                    { key: 'wednesday', label: 'Onsdag' },
                    { key: 'thursday', label: 'Torsdag' },
                    { key: 'friday', label: 'Fredag' },
                    { key: 'saturday', label: 'Lørdag' },
                    { key: 'sunday', label: 'Søndag' },
                  ] as const
                ).map(({ key, label }) => {
                  const value = bar.openingHours?.[key] ?? '—';
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                        isToday
                          ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {label}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Kontakt
            </h3>
            {bar.phone ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Telefon: <span className="font-medium">{bar.phone}</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Ingen telefonnummer registrert.
              </p>
            )}
          </div>
        </div>
      </div>

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

