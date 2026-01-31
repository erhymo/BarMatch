import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';
import { getStripeServer } from '@/lib/stripe/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { me } = await requireRole(request, ['superadmin', 'bar_owner']);

    const body = (await request.json()) as { barId?: unknown };
    const barId = typeof body.barId === 'string' ? body.barId.trim() : '';
    if (!barId) return NextResponse.json({ error: 'Missing barId' }, { status: 400 });

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) return NextResponse.json({ error: 'Missing APP_BASE_URL' }, { status: 500 });

    const defaultPriceId = process.env.STRIPE_DEFAULT_PRICE_ID;
    if (!defaultPriceId) {
      return NextResponse.json({ error: 'Missing STRIPE_DEFAULT_PRICE_ID' }, { status: 500 });
    }

    const db = getFirebaseAdminDb();
    const barRef = db.collection('bars').doc(barId);
    const snap = await barRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const bar = snap.data() as {
      email?: string;
      stripe?: { customerId?: string; trialDays?: number; priceId?: string };
    };

    if (!bar.email) return NextResponse.json({ error: 'Bar is missing email' }, { status: 400 });

    const trialDays = typeof bar.stripe?.trialDays === 'number' ? bar.stripe.trialDays : 0;
    const priceId = bar.stripe?.priceId ?? defaultPriceId;

    const stripe = getStripeServer();
    let customerId = bar.stripe?.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: bar.email,
        metadata: { barId },
      });
      customerId = customer.id;
      await barRef.set(
        { stripe: { customerId }, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
	      client_reference_id: barId,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}/onboard/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/onboard?step=payment&barId=${encodeURIComponent(barId)}&cancel=1`,
      metadata: { barId },
      subscription_data: {
        metadata: { barId },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
    });

    if (!session.url) return NextResponse.json({ error: 'Stripe session missing url' }, { status: 500 });

    await barRef.set(
      {
        billingEnabled: true,
        stripe: { customerId, priceId },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

