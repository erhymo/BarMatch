import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    const { me } = await requireRole(request, ['superadmin', 'bar_owner']);
    const { barId } = await params;

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { ids?: unknown };
    const idsRaw = body.ids;

    if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const ids: string[] = [];
    for (const v of idsRaw) {
      if (typeof v === 'string' && v.trim()) {
        ids.push(v.trim());
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const db = getFirebaseAdminDb();
    const batch = db.batch();

    for (const id of ids) {
      const ref = db.collection('barMessages').doc(id);
      const snap = await ref.get();
      if (!snap.exists) continue;
      const data = (snap.data() ?? {}) as { barId?: unknown };
      const docBarId = typeof data.barId === 'string' ? data.barId : null;
      if (docBarId !== barId) continue;

      batch.update(ref, {
        readByBar: true,
        readAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

