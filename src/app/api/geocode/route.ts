import { NextResponse } from 'next/server';
import { requireFirebaseUser } from '@/lib/admin/serverAuth';

export const runtime = 'nodejs';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isAddressComponent(
  value: unknown,
): value is { long_name: string; short_name: string; types: string[] } {
  const rec = asRecord(value);
  if (!rec) return false;
  if (typeof rec.long_name !== 'string') return false;
  if (typeof rec.short_name !== 'string') return false;
  if (!Array.isArray(rec.types) || !rec.types.every((t) => typeof t === 'string')) return false;
  return true;
}

function pickComponent(
  comps: Array<{ long_name: string; short_name: string; types: string[] }>,
  type: string,
) {
  return comps.find((c) => c.types.includes(type));
}

export async function POST(request: Request) {
  try {
    await requireFirebaseUser(request);

    const body = (await request.json()) as { address?: unknown };
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });

    const key = process.env.GOOGLE_GEOCODING_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return NextResponse.json({ error: 'Missing Google Maps API key' }, { status: 500 });

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', key);

    const res = await fetch(url.toString(), { method: 'GET' });
		const raw: unknown = await res.json().catch(() => null);
		const json = asRecord(raw) ?? {};

    if (!res.ok) {
			return NextResponse.json({ error: 'Geocoding failed', details: raw }, { status: 500 });
    }

		const status = typeof json.status === 'string' ? json.status : null;
		const results = Array.isArray(json.results) ? json.results : [];
		const first = results[0];
		const r = asRecord(first);

		if (status !== 'OK' || !r) {
			return NextResponse.json({ error: 'No results', status: status ?? 'unknown' }, { status: 400 });
    }

		const geometry = asRecord(r.geometry);
		const loc = asRecord(geometry?.location);
		const lat = typeof loc?.lat === 'number' ? loc.lat : null;
		const lng = typeof loc?.lng === 'number' ? loc.lng : null;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid geocode result' }, { status: 500 });
    }

		const compsRaw = Array.isArray(r.address_components) ? r.address_components : [];
		const comps = compsRaw.filter(isAddressComponent);
    const city =
      pickComponent(comps, 'locality')?.long_name ??
      pickComponent(comps, 'postal_town')?.long_name ??
      pickComponent(comps, 'administrative_area_level_1')?.long_name ??
      '';
    const country = pickComponent(comps, 'country')?.short_name ?? '';

    return NextResponse.json({
      ok: true,
			formattedAddress: typeof r.formatted_address === 'string' ? r.formatted_address : address,
      location: { lat, lng },
      city,
      country,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

