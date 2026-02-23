import { NextResponse } from 'next/server';
import { fetchNearbySportsbarsFromPlaces } from '@/lib/googlePlacesSportsbars';

export const runtime = 'nodejs';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
	  try {
	    const url = new URL(request.url);
	    const search = url.searchParams;
	
	    const latRaw = search.get('lat');
	    const lngRaw = search.get('lng');
	    const radiusRaw = search.get('radius');
	
	    const lat = latRaw !== null ? Number(latRaw) : NaN;
	    const lng = lngRaw !== null ? Number(lngRaw) : NaN;
	    const radiusInput = radiusRaw !== null ? Number(radiusRaw) : NaN;
	
	    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
	      return NextResponse.json({ error: 'Missing or invalid lat/lng', bars: [] }, { status: 400 });
	    }
	
	    const radius = Number.isFinite(radiusInput) ? radiusInput : 2500;
	    const clampedRadius = Math.min(Math.max(radius, 500), 5000);
	
	    const key = process.env.GOOGLE_PLACES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	    if (!key) {
	      return NextResponse.json({ error: 'Missing Google Places API key', bars: [] }, { status: 500 });
	    }
	
	    const { bars, status } = await fetchNearbySportsbarsFromPlaces({
	      lat,
	      lng,
	      radius: clampedRadius,
	      apiKey: key,
	    });
	
	    if (!bars.length) {
	      return NextResponse.json({ bars: [], status: status ?? 'NO_RESULTS' });
	    }
	
	    return NextResponse.json({ bars });
	  } catch (e) {
	    const msg = e instanceof Error ? e.message : 'Unknown error';
	    return NextResponse.json({ error: msg, bars: [] }, { status: 500 });
	  }
}

