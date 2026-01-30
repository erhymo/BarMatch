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

    const body = (await request.json()) as { isVisible?: unknown };
    if (typeof body.isVisible !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    await db
      .collection('bars')
      .doc(barId)
      .set({ isVisible: body.isVisible, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
