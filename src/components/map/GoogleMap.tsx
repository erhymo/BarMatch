'use client';

import { useCallback, useEffect, useState } from 'react';
import {
	  GoogleMap as GoogleMapComponent,
	  LoadScriptNext,
	  Marker,
	  InfoWindow,
	} from '@react-google-maps/api';
import { Bar } from '@/lib/models';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRatings } from '@/contexts/RatingsContext';
import { getBarPinIcon, type BarPinType } from '@/lib/map/barPin';
import { useTranslation } from '@/lib/i18n';

const defaultContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center: Oslo, Norway
const defaultCenter = {
	  lat: 59.9139,
	  lng: 10.7522,
	};

function buildCandidateOnboardingMailto(bar: Bar, t: (key: string) => string): string {
	  const name = bar.name || 'Bar';
	  const subject = encodeURIComponent(`${name} – onboarding`);
	  const bodyLines = [
	    t('map_mailto_greeting'),
	    '',
	    t('map_mailto_body').replace('{name}', name),
	    '',
	    t('map_mailto_interest'),
	    '',
	    t('map_mailto_closing'),
	    '[Navn]',
	    '[Telefonnummer]',
	  ];
	  const body = encodeURIComponent(bodyLines.join('\n'));
	  return `mailto:post@where2watch.no?subject=${subject}&body=${body}`;
	}

interface GoogleMapProps {
	  apiKey: string;
	  center?: {
	    lat: number;
	    lng: number;
	  };
		  /**
		   * If set, the map will pan to this position (and optionally zoom).
		   * Useful for "Finn nærmeste bar" without fighting with geolocation auto-pan.
		   */
		  focusPosition?: { lat: number; lng: number } | null;
		  focusZoom?: number;
		  /**
		   * Callback to expose the user's current position to parent.
		   */
		  onUserPositionChange?: (pos: { lat: number; lng: number } | null) => void;
	  zoom?: number;
	  height?: string;
	  useGeolocation?: boolean;
	  /**
	   * Hvis true vil kartet ikke automatisk panoreres til brukerens posisjon
		   * selv om geolokasjon er aktivert. Brukes når vi har en eksplisitt
	   * startposisjon (f.eks. favoritt-by).
	   */
	  disableAutoPanToUser?: boolean;
	  bars?: Bar[];
	  onBarClick?: (bar: Bar) => void;
		  /**
			   * Kalles når brukeren klikker på selve kartet (ikke på en bar-markør).
			   * Brukes blant annet til å lukke åpne paneler i UI-et.
		   */
			  onMapClick?: () => void;
			  /**
			   * Kalles når kartets viewport endrer seg (pan/zoom) slik at vi kan hente inn
			   * nye hvite sportsbarer basert på det brukeren faktisk ser på.
			   */
			  onViewportChange?: (center: { lat: number; lng: number }, zoom: number) => void;
	}

	export default function GoogleMap({
	  apiKey,
	  center = defaultCenter,
		  focusPosition = null,
		  focusZoom,
		  onUserPositionChange,
	  zoom = 12,
	  height = '100%',
	  useGeolocation = false,
	  disableAutoPanToUser = false,
	  bars = [],
		  onBarClick,
			  onMapClick,
			  onViewportChange,
	}: GoogleMapProps) {
  const [hasMounted, setHasMounted] = useState(false);
	  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);
	  const [map, setMap] = useState<google.maps.Map | null>(null);
	  const [currentPosition, setCurrentPosition] =
	    useState<{ lat: number; lng: number } | null>(null);
	  const [isLoadingPosition, setIsLoadingPosition] = useState(false);
	  const [locationError, setLocationError] = useState<string | null>(null);
		  const [showLocationHelp, setShowLocationHelp] = useState(false);
	  const [isRetryingLocation, setIsRetryingLocation] = useState(false);
	  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
	  const [isMapReady, setIsMapReady] = useState(false);
	  const [mapError, setMapError] = useState<string | null>(null);
	  const { isFavoriteBar } = useFavorites();
	  const { getBarRating } = useRatings();
  const { t } = useTranslation();

	  type GoogleMapsAuthWindow = Window & {
	    gm_authFailure?: () => void;
	  };

  // Avoid SSR/hydration issues with Google Maps by only rendering the actual map
  // after the component has mounted in the browser.
  useEffect(() => {
    setHasMounted(true);
  }, []);

	  // Catch invalid/blocked API key (auth failures) and show a friendly error instead
	  // of leaving the user with an endless spinner.
	  useEffect(() => {
	    if (!hasMounted) return;

	    const w = window as GoogleMapsAuthWindow;
	    // Google Maps calls window.gm_authFailure() when auth fails.
	    w.gm_authFailure = () => {
	      setMapError(
	        t('map_auth_error')
	      );
	    };

	    return () => {
	      try {
	        delete w.gm_authFailure;
	      } catch {
	        // ignore
	      }
	    };
	  }, [hasMounted]);

  // If the map takes unusually long to load, show a hint while still loading.
  useEffect(() => {
    if (!hasMounted) return;
    if (mapError || isMapReady) {
      setShowSlowLoadHint(false);
      return;
    }

    const t = window.setTimeout(() => setShowSlowLoadHint(true), 10000);
    return () => window.clearTimeout(t);
  }, [hasMounted, isMapReady, mapError]);

  const containerStyle = {
    ...defaultContainerStyle,
    height: height,
  };

	// Get user's current position
	useEffect(() => {
	  if (!useGeolocation) return;

	  if (!navigator.geolocation) {
	    setLocationError(t('map_geo_unsupported'));
	    return;
	  }

	  setIsLoadingPosition(true);

	  navigator.geolocation.getCurrentPosition(
	    (position) => {
	      const pos = {
	        lat: position.coords.latitude,
	        lng: position.coords.longitude,
	      };
	      setCurrentPosition(pos);
		      onUserPositionChange?.(pos);
	      setIsLoadingPosition(false);
	      setLocationError(null);

	      // Center map on user's position dersom vi ikke eksplisitt vil
	      // låse kartet til en forhåndsbestemt posisjon (favoritt-by).
	      if (map && !disableAutoPanToUser) {
	        map.panTo(pos);
	      }
	    },
	    (error) => {
	      setIsLoadingPosition(false);
			  setShowLocationHelp(false);
		      onUserPositionChange?.(null);
	      switch (error.code) {
	        case error.PERMISSION_DENIED:
	          setLocationError(t('map_geo_denied'));
	          break;
	        case error.POSITION_UNAVAILABLE:
	          setLocationError(t('map_geo_unavailable'));
	          break;
	        case error.TIMEOUT:
	          setLocationError(t('map_geo_timeout'));
	          break;
	        default:
	          setLocationError(t('map_geo_unknown'));
	          break;
	      }
	    },
	    {
	      enableHighAccuracy: true,
	      timeout: 10000,
	      maximumAge: 0,
	    }
	  );
		}, [useGeolocation, disableAutoPanToUser, map, onUserPositionChange]);

		// Allow parent to programmatically focus the map (e.g. nearest bar)
		useEffect(() => {
		  if (!map) return;
		  if (!focusPosition) return;
		  map.panTo(focusPosition);
		  if (typeof focusZoom === 'number') {
		    map.setZoom(focusZoom);
		  }
		}, [map, focusPosition, focusZoom]);

	  const onLoad = useCallback((map: google.maps.Map) => {
	    setMap(map);
	    setIsMapReady(true);
	    setMapError(null);
	  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
	    setIsMapReady(false);
  }, []);

	// Determine which center to use.
		// Hvis disableAutoPanToUser er satt (f.eks. når vi har favoritt-by),
	// lar vi center-propen styre og ignorerer currentPosition som kart-senter.
	const mapCenter = disableAutoPanToUser ? center : currentPosition || center;

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800">
        <div className="text-center p-8">
          <p className="text-gray-600 dark:text-gray-400 mb-2">Google Maps API-nøkkel mangler</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Legg til NEXT_PUBLIC_GOOGLE_MAPS_API_KEY i .env.local</p>
        </div>
      </div>
    );
  }

  if (!hasMounted) {
    return (
      <div className="relative w-full h-full">
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-5 py-4 shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-900 dark:border-zinc-50"></div>
            <div className="text-sm text-zinc-800 dark:text-zinc-100">Laster kartet ...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading indicator */}
      {isLoadingPosition && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white dark:bg-zinc-800 px-4 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900 dark:border-zinc-50"></div>
            <p className="text-sm text-zinc-900 dark:text-zinc-50">Henter din posisjon...</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {locationError && (
	        <button
	          type="button"
	          onClick={() => {
	            if (!navigator.geolocation || isRetryingLocation) return;
	            setIsRetryingLocation(true);
	            navigator.geolocation.getCurrentPosition(
	              (position) => {
	                const pos = {
	                  lat: position.coords.latitude,
	                  lng: position.coords.longitude,
	                };
	                setCurrentPosition(pos);
	                onUserPositionChange?.(pos);
	                setIsLoadingPosition(false);
	                setLocationError(null);
	                setIsRetryingLocation(false);
	                setShowLocationHelp(false);
	                if (map && !disableAutoPanToUser) {
	                  map.panTo(pos);
	                }
	              },
	              () => {
	                setIsRetryingLocation(false);
	                setShowLocationHelp(true);
	              },
	              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
	            );
	          }}
	          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg shadow-lg border border-red-200 dark:border-red-800 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:focus-visible:ring-red-500"
	        >
	          <p className="text-sm text-red-800 dark:text-red-200">{locationError}</p>
	          <p className="mt-0.5 text-xs text-red-600 dark:text-red-300 underline flex items-center gap-1.5">
	            {isRetryingLocation && <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 dark:border-red-300" />}
	            {isRetryingLocation ? t('map_geo_denied_retrying') : t('map_geo_denied_tap')}
	          </p>
	          {showLocationHelp && (
	            <p className="mt-1 text-xs text-red-900/90 dark:text-red-100/90">
	              {t('map_geo_denied_help')}
	            </p>
	          )}
	        </button>
      )}

	      {/* Map loading and error states */}
	      {!isMapReady && !mapError && (
	        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
	          <div className="pointer-events-auto rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 px-5 py-4 shadow-lg flex items-center gap-3">
	            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-900 dark:border-zinc-50"></div>
	            <div className="text-sm text-zinc-800 dark:text-zinc-100">
	              <div>Laster kartet ...</div>
	              {showSlowLoadHint && (
	                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
	                  Tar det lang tid? Sjekk at API-nokkelen er gyldig, og prov aa reloade.
	                </div>
	              )}
	            </div>
	          </div>
	        </div>
	      )}

	      {mapError && (
	        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
	          <div className="pointer-events-auto max-w-md rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-5 py-4 shadow-lg text-sm text-red-800 dark:text-red-100">
	            <p className="font-medium mb-1">{t('map_could_not_load')}</p>
	            <p>{mapError}</p>
	            <p className="mt-2 text-xs opacity-90">
	              {t('map_tip_reload')}
	            </p>
	          </div>
	        </div>
	      )}

	      {!mapError && (
	        <LoadScriptNext
	          id="google-map-script"
	          googleMapsApiKey={apiKey}
	          onError={() =>
	            setMapError(
	              t('map_load_error')
	            )
	          }
	          loadingElement={<div style={containerStyle} />}
	          preventGoogleFontsLoading
		        >
		          <GoogleMapComponent
		          mapContainerStyle={containerStyle}
		          center={mapCenter}
		          zoom={zoom}
		          onLoad={onLoad}
		          onUnmount={onUnmount}
			          onClick={onMapClick}
			          onIdle={() => {
			            if (!onViewportChange || !map) return;
			            const center = map.getCenter();
			            if (!center) return;
			            const pos = { lat: center.lat(), lng: center.lng() };
			            const currentZoom = map.getZoom() ?? zoom;
			            onViewportChange(pos, currentZoom);
			          }}
		          options={{
            zoomControl: true,
            zoomControlOptions: {
              position: 7, // RIGHT_CENTER
            },
            streetViewControl: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: 3, // TOP_RIGHT
            },
            fullscreenControl: true,
            fullscreenControlOptions: {
              position: 7, // RIGHT_CENTER
            },
            gestureHandling: 'greedy', // Allows scrolling without Ctrl key
            clickableIcons: true,
          }}
        >
          {/* User position marker */}
	          {currentPosition && isMapReady && typeof google !== 'undefined' && (
            <Marker
              position={currentPosition}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              title="Din posisjon"
            />
          )}

		      {/* Bar markers – only render when google.maps is available */}
		        {isMapReady && typeof google !== 'undefined' && bars.map((bar) => {
			          const isFavorite = isFavoriteBar(bar.id);
			          const barRating = getBarRating(bar.id);
			          const ratingValue = barRating?.averageRating ?? bar.rating ?? 0;
			          // Hvis source ikke er satt antar vi at baren er en partner-bar slik
			          // at eksisterende data fortsetter å fungere. Disse regnes som kunder.
			          const isCustomerBar = bar.source ? bar.source === 'partner' : true;
						  const isSelected = selectedBar?.id === bar.id;
						  const pinType: BarPinType = isCustomerBar ? 'customer' : 'nonCustomer';

		          return (
		            <Marker
		              key={bar.id}
		              position={bar.position}
		              onClick={() => {
		                setSelectedBar(bar);
		                // Hvis parent har gitt onBarClick, åpner vi detaljvisning
		                // (både for partner-barer og hvite kandidater).
		                if (onBarClick) {
		                  onBarClick(bar);
		                }
		              }}
		              icon={{
		                url: getBarPinIcon(pinType),
		                scaledSize: new google.maps.Size(38, 38),
		                anchor: new google.maps.Point(19, 38),
		              }}
		              title={
		                ratingValue > 0
		                  ? `${bar.name} – ${ratingValue.toFixed(1)}★`
		                  : bar.name
		              }
		            />
		          );
		        })}
					
				      {/* InfoWindow for valgt bar når onBarClick ikke er gitt.
				         Brukes som enkel tooltip i kontekster uten eget detaljpanel. */}
				      {selectedBar && !onBarClick && (
				        <InfoWindow
			          position={selectedBar.position}
			          onCloseClick={() => setSelectedBar(null)}
			        >
			          {selectedBar.source === 'places_candidate' ? (
			            <div className="max-w-xs rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-md dark:border-zinc-700 dark:bg-zinc-900/95">
			              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-1">
			                {selectedBar.name}
			              </h3>
			              {selectedBar.address && (
			                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
			                  📍 {selectedBar.address}
			                </p>
			              )}
			              {/* “Tomt” innhold som viser hvordan kunde-kortet ser ut */}
			              <p className="text-sm text-zinc-700 dark:text-zinc-200 mb-1">
			                Når baren blir kunde vil profiltekst, kampoppsett og tilbud vises her.
			              </p>
			              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
			                Denne baren er foreløpig ikke aktiv kunde hos Where2Watch.
			              </p>
			              <div className="flex items-center mt-1 mb-2">
			                <span className="text-yellow-500 mr-1">⭐</span>
			                <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500 mr-1">
			                  Rating kommer her når baren samler vurderinger.
			                </span>
			              </div>
			              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
			                Eier du denne baren?{' '}
			                <a
			                  href={buildCandidateOnboardingMailto(selectedBar, t)}
			                  className="font-medium text-emerald-600 hover:text-emerald-700 underline"
			                >
			                  Klikk her for å sende oss en e-post om onboarding
			                </a>
			              </p>
			            </div>
			          ) : (
			            <div className="max-w-xs rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-md dark:border-zinc-700 dark:bg-zinc-900/95">
			              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-1">
			                {selectedBar.name}
			              </h3>
			              {selectedBar.address && (
			                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
			                  📍 {selectedBar.address}
			                </p>
			              )}
			              {selectedBar.description && (
			                <p className="text-sm text-zinc-700 dark:text-zinc-200 mb-2">
			                  {selectedBar.description}
			                </p>
			              )}
			              {(() => {
			                const partnerRating = getBarRating(selectedBar.id);
			                const ratingValueInner =
			                  partnerRating?.averageRating ?? selectedBar.rating ?? 0;
			                const totalRatings =
			                  partnerRating?.totalRatings ?? (selectedBar.rating ? 1 : 0);
			  
			                if (!ratingValueInner) return null;
			  
			                return (
			                  <div className="flex items-center mt-1">
			                    <span className="text-yellow-500 mr-1">⭐</span>
			                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mr-1">
			                      {ratingValueInner.toFixed(1)}
			                    </span>
			                    <span className="text-xs text-zinc-500">
			                      ({totalRatings})
			                    </span>
			                  </div>
			                );
			              })()}
			            </div>
			          )}
			        </InfoWindow>
			      )}
	          </GoogleMapComponent>
	        </LoadScriptNext>
	      )}
    </div>
  );
}

