import { asRecord } from '@/lib/utils/unknown';

type AddressComponent = { long_name: string; short_name: string; types: string[] };

export type ResolvedGoogleAddress = {
  formattedAddress: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
};

export type GoogleGeocodeCandidate = ResolvedGoogleAddress;

export type GeocodeAddressInput = {
  address: string;
  city?: string;
  country?: string;
};

export class GoogleGeocodeError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'GoogleGeocodeError';
  }
}

export class GoogleGeocodeAmbiguousError extends GoogleGeocodeError {
  constructor(readonly candidates: GoogleGeocodeCandidate[]) {
    super('Flere adresser matcher. Velg riktig adresse.', 409);
    this.name = 'GoogleGeocodeAmbiguousError';
  }
}

const PREFERRED_RESULT_TYPES = ['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest', 'route'] as const;
const MAX_CANDIDATES = 5;

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

function normalizeHint(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildGeocodeQueries(input: GeocodeAddressInput): string[] {
  const address = input.address.trim();
  const city = normalizeHint(input.city);
  const country = normalizeHint(input.country);

  return Array.from(new Set([
    [address, city, country].filter(Boolean).join(', '),
    [address, country].filter(Boolean).join(', '),
    address,
  ].filter(Boolean)));
}

function createGoogleGeocodeUrl(): URL {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('key', getGeocodingApiKey());
  url.searchParams.set('language', 'no');
  url.searchParams.set('region', 'no');
  return url;
}

function getResultTypes(result: Record<string, unknown>): string[] {
  return Array.isArray(result.types)
    ? result.types.filter((type): type is string => typeof type === 'string')
    : [];
}

function getResultTypeRank(result: Record<string, unknown>): number {
  const types = getResultTypes(result);
  const rank = PREFERRED_RESULT_TYPES.findIndex((type) => types.includes(type));
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

function chooseBestResult(results: unknown[]): Record<string, unknown> | null {
  const records = results.map((value) => asRecord(value)).filter((value): value is Record<string, unknown> => Boolean(value));
  return records.find((record) => {
    const rank = getResultTypeRank(record);
    return rank !== Number.MAX_SAFE_INTEGER;
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

async function runGoogleGeocodeCandidates(url: URL, fallbackAddress: string): Promise<GoogleGeocodeCandidate[]> {
  const res = await fetch(url.toString(), { method: 'GET' });
  const raw: unknown = await res.json().catch(() => null);
  const json = asRecord(raw) ?? {};

  if (!res.ok) {
    throw new GoogleGeocodeError('Geocoding failed', 502);
  }

  const status = typeof json.status === 'string' ? json.status : null;
  const results = Array.isArray(json.results) ? json.results : [];

  if (status !== 'OK' || results.length === 0) {
    throw new GoogleGeocodeError(`No results${status ? ` (${status})` : ''}`, 400);
  }

  const records = results
    .map((value) => asRecord(value))
    .filter((value): value is Record<string, unknown> => Boolean(value));

  const resolved = records.flatMap((record) => {
    try {
      return [{ record, candidate: toResolvedAddress(record, fallbackAddress) }];
    } catch {
      return [];
    }
  });

  const norwegian = resolved.filter(({ candidate }) => candidate.country === 'NO');
  const scoped = norwegian.length > 0 ? norwegian : resolved;
  const preferred = scoped.filter(({ record }) => getResultTypeRank(record) !== Number.MAX_SAFE_INTEGER);
  const ranked = (preferred.length > 0 ? preferred : scoped)
    .sort((a, b) => getResultTypeRank(a.record) - getResultTypeRank(b.record));

  const candidates: GoogleGeocodeCandidate[] = [];
  const seen = new Set<string>();

  for (const { candidate } of ranked) {
    const key = `${candidate.formattedAddress.toLowerCase()}|${candidate.location.lat.toFixed(6)}|${candidate.location.lng.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  if (candidates.length === 0) {
    throw new GoogleGeocodeError('No results', 400);
  }

  return candidates;
}

export async function geocodeAddress(input: string | GeocodeAddressInput): Promise<ResolvedGoogleAddress> {
  const request = typeof input === 'string' ? { address: input } : input;
  const trimmed = request.address.trim();
  if (!trimmed) throw new GoogleGeocodeError('Missing address', 400);

  let lastNoResultsError: GoogleGeocodeError | null = null;

  for (const query of buildGeocodeQueries({ ...request, address: trimmed })) {
    const url = createGoogleGeocodeUrl();
    url.searchParams.set('address', query);

    try {
      const candidates = await runGoogleGeocodeCandidates(url, trimmed);
      if (candidates.length === 1) return candidates[0];
      throw new GoogleGeocodeAmbiguousError(candidates);
    } catch (error) {
      if (error instanceof GoogleGeocodeError && error.statusCode === 400) {
        lastNoResultsError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNoResultsError ?? new GoogleGeocodeError('No results', 400);
}

export async function reverseGeocodeLocation(location: { lat: number; lng: number }): Promise<ResolvedGoogleAddress> {
  const { lat, lng } = location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new GoogleGeocodeError('Invalid location', 400);
  }

  const url = createGoogleGeocodeUrl();
  url.searchParams.set('latlng', `${lat},${lng}`);
  return runGoogleGeocode(url, `${lat},${lng}`);
}