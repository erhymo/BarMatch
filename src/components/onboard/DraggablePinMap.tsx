'use client';

import { useCallback, useState } from 'react';
import { GoogleMap as GoogleMapComponent, LoadScriptNext, Marker } from '@react-google-maps/api';

type LatLng = { lat: number; lng: number };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export default function DraggablePinMap(props: {
  apiKey: string;
  center: LatLng;
  marker: LatLng;
  onChange: (pos: LatLng) => void;
  height?: string;
}) {
  const { apiKey, center, marker, onChange, height = '320px' } = props;
  const [mapError, setMapError] = useState<string | null>(null);

  const onDragEnd = useCallback(
		(e: unknown) => {
			// NOTE: We avoid referencing `google.maps.*` types here.
			const rec = asRecord(e);
			const ll = rec?.latLng;
			if (!ll) return;
			const llRec = asRecord(ll);
			const latFn = llRec?.lat;
			const lngFn = llRec?.lng;
			if (typeof latFn !== 'function' || typeof lngFn !== 'function') return;
			const lat = (latFn as (this: unknown) => number).call(ll);
			const lng = (lngFn as (this: unknown) => number).call(ll);
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
			onChange({ lat, lng });
		},
    [onChange],
  );

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        Mangler Google Maps API-nøkkel.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950" style={{ height }}>
      {mapError ? (
        <div className="p-4 text-sm text-red-700 dark:text-red-300">{mapError}</div>
      ) : (
        <LoadScriptNext
          id="onboard-draggable-map"
          googleMapsApiKey={apiKey}
          onError={() => setMapError('Kunne ikke laste Google Maps-skriptet.')}
          preventGoogleFontsLoading
        >
          <GoogleMapComponent
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={15}
            options={{ streetViewControl: false, fullscreenControl: true, mapTypeControl: false }}
          >
            <Marker position={marker} draggable onDragEnd={onDragEnd} />
          </GoogleMapComponent>
        </LoadScriptNext>
      )}
    </div>
  );
}

