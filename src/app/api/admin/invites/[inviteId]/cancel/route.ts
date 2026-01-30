import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    await requireRole(request, ['superadmin']);
    const { inviteId } = await params;

    const db = getFirebaseAdminDb();
    const ref = db.collection('invites').doc(inviteId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

		const invite = asRecord(snap.data());
		const status = typeof invite?.status === 'string' ? invite.status : null;
		if (status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be cancelled' }, { status: 400 });
    }

    await ref.set({ status: 'cancelled', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

