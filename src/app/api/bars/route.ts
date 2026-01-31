import { NextResponse } from 'next/server';

import type { Bar } from '@/lib/models';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const arr = value.filter((v): v is string => typeof v === 'string');
  return arr;
}

function parseLatLng(location: unknown): { lat: number; lng: number } | null {
  const rec = asRecord(location);
  if (!rec) return null;

  // Supports both {lat,lng} and GeoPoint-ish {latitude,longitude}
  const latRaw = rec.lat ?? rec.latitude;
  const lngRaw = rec.lng ?? rec.longitude;

  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function toPublicBar(docId: string, data: Record<string, unknown>): Bar | null {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) return null;

  const position = parseLatLng(data.location);
  if (!position) return null;

  const bar: Bar = {
    id: docId,
    name,
    position,
  };

  if (typeof data.address === 'string' && data.address.trim()) bar.address = data.address.trim();
  if (typeof data.description === 'string' && data.description.trim()) bar.description = data.description.trim();
  if (typeof data.phone === 'string' && data.phone.trim()) bar.phone = data.phone.trim();
  if (typeof data.imageUrl === 'string' && data.imageUrl.trim()) bar.imageUrl = data.imageUrl.trim();
  if (typeof data.rating === 'number' && Number.isFinite(data.rating)) bar.rating = data.rating;

  // Optional fields used by match filtering (persisted later via bar-owner UI)
  const selectedFixtureIds = parseStringArray(data.selectedFixtureIds);
  if (selectedFixtureIds) bar.selectedFixtureIds = selectedFixtureIds;
  const cancelledFixtureIds = parseStringArray(data.cancelledFixtureIds);
  if (cancelledFixtureIds) bar.cancelledFixtureIds = cancelledFixtureIds;

  // NOTE: We intentionally do not materialize `matches` here. Fixtures are fetched separately.
  return bar;
}

export async function GET() {
  try {
    const db = getFirebaseAdminDb();

    // Public endpoint: only returns bars that are currently visible.
    // Avoid orderBy to reduce Firestore index requirements; sort in-memory instead.
    const snap = await db.collection('bars').where('isVisible', '==', true).limit(500).get();

    const bars: Bar[] = [];
    for (const doc of snap.docs) {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const mapped = toPublicBar(doc.id, data);
      if (mapped) bars.push(mapped);
    }

    bars.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ bars });
  } catch (e) {
    console.error('GET /api/bars failed', e);
    return NextResponse.json({ error: 'Failed to load bars' }, { status: 500 });
  }
}
