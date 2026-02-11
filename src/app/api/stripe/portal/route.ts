import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin/serverAuth';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { getStripeServer } from '@/lib/stripe/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { me } = await requireRole(request, ['superadmin', 'bar_owner']);

    const body = (await request.json().catch(() => ({}))) as { barId?: unknown };
    const requestedBarId = typeof body.barId === 'string' ? body.barId.trim() : '';

    const barId = me.role === 'bar_owner' ? me.barId : requestedBarId;
    if (!barId) return NextResponse.json({ error: 'Missing barId' }, { status: 400 });

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) return NextResponse.json({ error: 'Missing APP_BASE_URL' }, { status: 500 });

    const db = getFirebaseAdminDb();
    const snap = await db.collection('bars').doc(barId).get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	    const bar = snap.data() as { email?: string; stripe?: { customerId?: string } } | undefined;
	    let customerId = bar?.stripe?.customerId;

	    const stripe = getStripeServer();

	    if (!customerId) {
	      const customer = await stripe.customers.create({
	        email: typeof bar?.email === 'string' ? bar.email : undefined,
	        metadata: { barId },
	      });
	      customerId = customer.id;
	      await snap.ref.set(
	        {
	          stripe: {
	            ...(bar?.stripe ?? {}),
	            customerId,
	          },
	        },
	        { merge: true },
	      );
	    }

	    const portal = await stripe.billingPortal.sessions.create({
	      customer: customerId!,
      return_url: `${appBaseUrl}/admin/bar`,
    });

    return NextResponse.json({ ok: true, url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

