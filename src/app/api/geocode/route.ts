import { NextResponse } from 'next/server';
import { requireFirebaseUser } from '@/lib/admin/serverAuth';
import { geocodeAddress, GoogleGeocodeError } from '@/lib/googleGeocoding';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireFirebaseUser(request);

    const body = (await request.json()) as { address?: unknown };
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const resolved = await geocodeAddress(address);

    return NextResponse.json({
      ok: true,
      formattedAddress: resolved.formattedAddress,
      location: resolved.location,
      city: resolved.city,
      country: resolved.country,
    });
  } catch (e) {
    if (e instanceof GoogleGeocodeError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

