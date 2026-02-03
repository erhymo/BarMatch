import { NextResponse } from 'next/server';

import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';

export type AuditLogDoc = {
  id: string;
  adminUid?: string;
  barId?: string | null;
  action?: string;
  details?: Record<string, unknown> | null;
  createdAt?: unknown;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    await requireRole(request, ['superadmin']);
    const { barId } = await params;

    const db = getFirebaseAdminDb();
    const snap = await db
      .collection('adminActions')
      .where('barId', '==', barId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const logs: AuditLogDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    return NextResponse.json({ logs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

