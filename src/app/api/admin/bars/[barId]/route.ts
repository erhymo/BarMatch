import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    const { me } = await requireRole(request, ['superadmin', 'bar_owner']);
    const { barId } = await params;

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getFirebaseAdminDb();
    const doc = await db.collection('bars').doc(barId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    const { me } = await requireRole(request, ['superadmin', 'bar_owner']);
    const { barId } = await params;

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if ('isVisible' in body) {
      if (typeof body.isVisible !== 'boolean') {
        return NextResponse.json({ error: 'Invalid isVisible' }, { status: 400 });
      }
      update.isVisible = body.isVisible;
    }

    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      update.name = body.name.trim();
    }

    if ('address' in body) {
      if (typeof body.address !== 'string' || !body.address.trim()) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      update.address = body.address.trim();
    }

    if ('city' in body) {
      if (typeof body.city !== 'string') {
        return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
      }
      update.city = body.city.trim();
    }

    if ('country' in body) {
      if (typeof body.country !== 'string') {
        return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
      }
      update.country = body.country.trim();
    }

    if ('location' in body) {
      const loc = body.location as { lat?: unknown; lng?: unknown } | null;
      const lat = typeof loc?.lat === 'number' ? loc.lat : Number(loc?.lat);
      const lng = typeof loc?.lng === 'number' ? loc.lng : Number(loc?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      }
      update.location = { lat, lng };
    }

    const hasFields = Object.keys(update).some((k) => k !== 'updatedAt');
    if (!hasFields) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    await db.collection('bars').doc(barId).set(update, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
