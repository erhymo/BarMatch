import type { Bar } from '@/lib/models';
import { asRecord } from '@/lib/utils/unknown';

export interface NearbySportsbarRequest {
  lat: number;
  lng: number;
  radius: number;
  apiKey: string;
}

export interface NearbySportsbarResult {
  bars: Bar[];
  /** Status-feltet fra Google Places API, f.eks. "OK" eller "ZERO_RESULTS". */
  status: string | null;
}

/**
 * Henter sportsbarer fra Google Places Nearby Search API og mapper dem til vårt Bar-format.
 *
 * NB: Denne funksjonen har ingen kjennskap til Next.js eller HTTP-responser,
 * og kan derfor gjenbrukes fra både API-ruter og fremtidige bakgrunnsskript.
 */
export async function fetchNearbySportsbarsFromPlaces(
  params: NearbySportsbarRequest,
): Promise<NearbySportsbarResult> {
  const { lat, lng, radius, apiKey } = params;

  const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  placesUrl.searchParams.set('location', `${lat},${lng}`);
  placesUrl.searchParams.set('radius', String(radius));
  placesUrl.searchParams.set('type', 'bar');
  // Søker spesifikt etter sportsbarer / fotballbarer
  placesUrl.searchParams.set('keyword', 'sports bar football soccer');
  placesUrl.searchParams.set('key', apiKey);

  const res = await fetch(placesUrl.toString(), { method: 'GET', cache: 'no-store' });
  const rawJson: unknown = await res.json().catch(() => null);
  const json = asRecord(rawJson) ?? {};

  const status = typeof json.status === 'string' ? json.status : null;
  const resultsRaw = Array.isArray(json.results) ? json.results : [];

  if (!res.ok) {
    const statusText = status ?? 'ERROR';
    throw new Error(`Failed to fetch sportsbars from Places API (status: ${statusText})`);
  }

  if (status !== 'OK' || resultsRaw.length === 0) {
    return { bars: [], status: status ?? 'NO_RESULTS' };
  }

  const bars: Bar[] = [];

  for (const item of resultsRaw) {
    const r = asRecord(item);
    if (!r) continue;

    const placeId = typeof r.place_id === 'string' ? r.place_id : null;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (!placeId || !name) continue;

    const geometry = asRecord(r.geometry);
    const loc = asRecord(geometry?.location);
    const plat = typeof loc?.lat === 'number' ? loc.lat : null;
    const plng = typeof loc?.lng === 'number' ? loc.lng : null;
    if (typeof plat !== 'number' || typeof plng !== 'number') continue;

    const vicinity = typeof r.vicinity === 'string' ? r.vicinity : undefined;
    const formattedAddress = typeof r.formatted_address === 'string' ? r.formatted_address : undefined;
    const rating = typeof r.rating === 'number' ? r.rating : undefined;

    const bar: Bar = {
      id: `places:${placeId}`,
      name,
      position: { lat: plat, lng: plng },
      source: 'places_candidate',
      address: formattedAddress ?? vicinity,
      rating,
      googlePlaceId: placeId,
    };

    bars.push(bar);
  }

  return { bars, status };
}

