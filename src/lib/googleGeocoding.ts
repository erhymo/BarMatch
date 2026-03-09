import { asRecord } from '@/lib/utils/unknown';

type AddressComponent = { long_name: string; short_name: string; types: string[] };

export type ResolvedGoogleAddress = {
  formattedAddress: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
};

export class GoogleGeocodeError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'GoogleGeocodeError';
  }
}

function isAddressComponent(value: unknown): value is AddressComponent {
  const rec = asRecord(value);
  return Boolean(
    rec
      && typeof rec.long_name === 'string'
      && typeof rec.short_name === 'string'
      && Array.isArray(rec.types)
      && rec.types.every((t) => typeof t === 'string'),
  );
}

function pickComponent(comps: AddressComponent[], type: string) {
  return comps.find((c) => c.types.includes(type));
}

function pickCity(comps: AddressComponent[]): string {
  return (
    pickComponent(comps, 'locality')?.long_name
    ?? pickComponent(comps, 'postal_town')?.long_name
    ?? pickComponent(comps, 'administrative_area_level_3')?.long_name
    ?? pickComponent(comps, 'administrative_area_level_2')?.long_name
    ?? pickComponent(comps, 'administrative_area_level_1')?.long_name
    ?? ''
  );
}

function getGeocodingApiKey(): string {
  const key = process.env.GOOGLE_GEOCODING_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new GoogleGeocodeError('Missing Google Maps API key', 500);
  return key;
}

function chooseBestResult(results: unknown[]): Record<string, unknown> | null {
  const records = results.map((value) => asRecord(value)).filter((value): value is Record<string, unknown> => Boolean(value));
  const preferredTypes = new Set(['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest', 'route']);
  return records.find((record) => {
    const types = Array.isArray(record.types) ? record.types : [];
    return types.some((type) => typeof type === 'string' && preferredTypes.has(type));
  }) ?? records[0] ?? null;
}

function toResolvedAddress(result: Record<string, unknown>, fallbackAddress: string): ResolvedGoogleAddress {
  const geometry = asRecord(result.geometry);
  const loc = asRecord(geometry?.location);
  const lat = typeof loc?.lat === 'number' ? loc.lat : null;
  const lng = typeof loc?.lng === 'number' ? loc.lng : null;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new GoogleGeocodeError('Invalid geocode result', 502);
  }

  const compsRaw = Array.isArray(result.address_components) ? result.address_components : [];
  const comps = compsRaw.filter(isAddressComponent);

  return {
    formattedAddress: typeof result.formatted_address === 'string' ? result.formatted_address : fallbackAddress,
    location: { lat, lng },
    city: pickCity(comps),
    country: pickComponent(comps, 'country')?.short_name ?? '',
  };
}

async function runGoogleGeocode(url: URL, fallbackAddress: string): Promise<ResolvedGoogleAddress> {
  const res = await fetch(url.toString(), { method: 'GET' });
  const raw: unknown = await res.json().catch(() => null);
  const json = asRecord(raw) ?? {};

  if (!res.ok) {
    throw new GoogleGeocodeError('Geocoding failed', 502);
  }

  const status = typeof json.status === 'string' ? json.status : null;
  const results = Array.isArray(json.results) ? json.results : [];
  const best = chooseBestResult(results);

  if (status !== 'OK' || !best) {
    throw new GoogleGeocodeError(`No results${status ? ` (${status})` : ''}`, 400);
  }

  return toResolvedAddress(best, fallbackAddress);
}

export async function geocodeAddress(address: string): Promise<ResolvedGoogleAddress> {
  const trimmed = address.trim();
  if (!trimmed) throw new GoogleGeocodeError('Missing address', 400);

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', trimmed);
  url.searchParams.set('key', getGeocodingApiKey());
  url.searchParams.set('language', 'no');
  url.searchParams.set('region', 'no');
  return runGoogleGeocode(url, trimmed);
}

export async function reverseGeocodeLocation(location: { lat: number; lng: number }): Promise<ResolvedGoogleAddress> {
  const { lat, lng } = location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new GoogleGeocodeError('Invalid location', 400);
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', getGeocodingApiKey());
  url.searchParams.set('language', 'no');
  url.searchParams.set('region', 'no');
  return runGoogleGeocode(url, `${lat},${lng}`);
}