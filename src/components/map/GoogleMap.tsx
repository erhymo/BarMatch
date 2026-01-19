'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  GoogleMap as GoogleMapComponent,
  LoadScriptNext,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';
import { Bar } from '@/lib/models';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRatings } from '@/contexts/RatingsContext';

// Simple football (soccer ball) icon for bar markers, rendered as inline SVG
const FOOTBALL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
  '<circle cx="20" cy="20" r="18" fill="white" stroke="#111827" stroke-width="2" />' +
  '<path d="M20 7l6 3 2 6-4 4h-8l-4-4 2-6z" fill="#111827" />' +
  '<path d="M20 7l-4 4-2 6 3 6 3 8" stroke="#111827" stroke-width="1.5" fill="none" />' +
  '<path d="M20 7l4 4 2 6-3 6-3 8" stroke="#111827" stroke-width="1.5" fill="none" />' +
  '</svg>';

const FOOTBALL_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  FOOTBALL_SVG,
 )}`;

const defaultContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center: Oslo, Norway
const defaultCenter = {
  lat: 59.9139,
  lng: 10.7522,
};

interface GoogleMapProps {
  apiKey: string;
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  height?: string;
  useGeolocation?: boolean;
  bars?: Bar[];
  onBarClick?: (bar: Bar) => void;
}

export default function GoogleMap({
  apiKey,
  center = defaultCenter,
  zoom = 12,
  height = '600px',
  useGeolocation = false,
  bars = [],
  onBarClick
}: GoogleMapProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
	  const [isMapReady, setIsMapReady] = useState(false);
	  const [mapError, setMapError] = useState<string | null>(null);
  const { isFavoriteBar } = useFavorites();
  const { getBarRating } = useRatings();

  // Avoid SSR/hydration issues with Google Maps by only rendering the actual map
  // after the component has mounted in the browser.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Catch invalid/blocked API key (auth failures) and show a friendly error instead
  // of leaving the user with an endless spinner.
  useEffect(() => {
    if (!hasMounted) return;

    // Google Maps calls window.gm_authFailure() when auth fails.
    (window as any).gm_authFailure = () => {
      setMapError(
        'Google Maps kunne ikke autentiseres. Sjekk at API-nokkelen er gyldig og at Maps JavaScript API er aktivert.'
      );
    };

    return () => {
      try {
        delete (window as any).gm_authFailure;
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
      setLocationError('Geolocation er ikke støttet av din nettleser');
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
        setIsLoadingPosition(false);
        setLocationError(null);

        // Center map on user's position
        if (map) {
          map.panTo(pos);
        }
      },
      (error) => {
        setIsLoadingPosition(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Du må gi tillatelse til posisjonsdeling');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Posisjonsinformasjon er ikke tilgjengelig');
            break;
          case error.TIMEOUT:
            setLocationError('Forespørsel om posisjon tok for lang tid');
            break;
          default:
            setLocationError('En ukjent feil oppstod');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [useGeolocation, map]);

	  const onLoad = useCallback((map: google.maps.Map) => {
	    setMap(map);
	    setIsMapReady(true);
	    setMapError(null);
	  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
	    setIsMapReady(false);
  }, []);

  // Determine which center to use
  const mapCenter = currentPosition || center;

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
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{locationError}</p>
        </div>
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
	            <p className="font-medium mb-1">Kartet kunne ikke lastes</p>
	            <p>{mapError}</p>
	            <p className="mt-2 text-xs opacity-90">
	              Tips: Sjekk API-nokkel-restriksjoner (HTTP referrers) og prov aa reloade siden.
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
	              'Kunne ikke laste Google Maps-skriptet (nettverk eller blokkert ressurs).'
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

	          {/* Bar markers */}
	        {bars.map((bar) => {
	          const isFavorite = isFavoriteBar(bar.id);
	          const barRating = getBarRating(bar.id);
	          const ratingValue = barRating?.averageRating ?? bar.rating ?? 0;
	          const labelText = ratingValue > 0 ? ratingValue.toFixed(1) : '';

	          return (
	            <Marker
	              key={bar.id}
	              position={bar.position}
	              onClick={() => {
	                setSelectedBar(bar);
	                if (onBarClick) {
	                  onBarClick(bar);
	                }
	              }}
	              icon={{
	                url: FOOTBALL_ICON_URL,
	                // Gi favorittbarer litt høyere zIndex så de synes bedre
	                scaledSize: isFavorite
	                  ? ({ width: 42, height: 42 } as google.maps.Size)
	                  : ({ width: 36, height: 36 } as google.maps.Size),
	              }}
	              label={
	                labelText
	                  ? {
	                      text: labelText,
	                      // Gul ratingtekst over fotball-ikonet
	                      color: '#FACC15', // tailwind yellow-400
	                      fontSize: '10px',
	                      fontWeight: 'bold',
	                    }
	                  : undefined
	              }
	              title={
	                ratingValue > 0
	                  ? `${bar.name} – ${ratingValue.toFixed(1)}★`
	                  : bar.name
	              }
	            />
	          );
	        })}

	          {/* InfoWindow for selected bar - Simple tooltip */}
	          {selectedBar && !onBarClick && (
	            <InfoWindow
	              position={selectedBar.position}
	              onCloseClick={() => setSelectedBar(null)}
	            >
	              <div className="p-2 max-w-xs">
	                <h3 className="font-bold text-lg text-zinc-900 mb-1">
	                  {selectedBar.name}
	                </h3>
	                {selectedBar.address && (
	                  <p className="text-sm text-zinc-600 mb-2">
	                    📍 {selectedBar.address}
	                  </p>
	                )}
	                {selectedBar.description && (
	                  <p className="text-sm text-zinc-700 mb-2">
	                    {selectedBar.description}
	                  </p>
	                )}
	                {(() => {
	                  const barRating = getBarRating(selectedBar.id);
	                  const ratingValue = barRating?.averageRating ?? selectedBar.rating ?? 0;
	                  const totalRatings = barRating?.totalRatings ?? (selectedBar.rating ? 1 : 0);

	                  if (!ratingValue) return null;

	                  return (
	                    <div className="flex items-center mt-1">
	                      <span className="text-yellow-500 mr-1">⭐</span>
	                      <span className="text-sm font-medium text-zinc-900 mr-1">
	                        {ratingValue.toFixed(1)}
	                      </span>
	                      <span className="text-xs text-zinc-500">
	                        ({totalRatings})
	                      </span>
	                    </div>
	                  );
	                })()}
	              </div>
	            </InfoWindow>
	          )}
	          </GoogleMapComponent>
	        </LoadScriptNext>
	      )}
    </div>
  );
}

