import { NextResponse } from 'next/server';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';

export async function GET(request: Request) {
  try {
    await requireRole(request, ['superadmin']);

    const db = getFirebaseAdminDb();
    const snap = await db.collection('bars').orderBy('name').get();
    const bars = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

    return NextResponse.json({ bars });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
