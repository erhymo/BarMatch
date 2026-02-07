import { NextResponse } from 'next/server';

import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';

function toIsoMaybe(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;

  const rec = value as { toDate?: () => Date; toMillis?: () => number } | null;
  if (rec && typeof rec.toDate === 'function') {
    try {
      return rec.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (rec && typeof rec.toMillis === 'function') {
    try {
      const ms = rec.toMillis();
      return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    } catch {
      return null;
    }
  }
  return null;
}

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
    const snap = await db
      .collection('barMessages')
      .where('barId', '==', barId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const messages = snap.docs.map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const name = typeof data.name === 'string' ? data.name : null;
      const email = typeof data.email === 'string' ? data.email : '';
      const phone = typeof data.phone === 'string' ? data.phone : null;
      const message = typeof data.message === 'string' ? data.message : '';
      const readByBar = Boolean(data.readByBar);
      const createdAt = toIsoMaybe(data.createdAt);

      return {
        id: doc.id,
        barId,
        name,
        email,
        phone,
        message,
        readByBar,
        createdAt,
      };
    });

    return NextResponse.json({ messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

