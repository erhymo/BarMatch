import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';
import { getStripeServer } from '@/lib/stripe/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    await requireRole(request, ['superadmin']);
    const { barId } = await params;

    const db = getFirebaseAdminDb();
    const barRef = db.collection('bars').doc(barId);
    const snap = await barRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = snap.data() as { stripe?: { subscriptionId?: string } } | undefined;
    const subscriptionId = data?.stripe?.subscriptionId;

    if (subscriptionId) {
      await getStripeServer().subscriptions.cancel(subscriptionId);
    }

    await barRef.set(
      {
        billingEnabled: false,
        billingStatus: 'canceled',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
