import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';
import { getStripeServer } from '@/lib/stripe/server';
import { sendStartSubscriptionEmail } from '@/lib/email/mailer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    await requireRole(request, ['superadmin']);
    const { barId } = await params;

    const priceId = process.env.STRIPE_DEFAULT_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: 'Missing STRIPE_DEFAULT_PRICE_ID' }, { status: 500 });
    }

    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) {
      return NextResponse.json({ error: 'Missing APP_BASE_URL' }, { status: 500 });
    }

    const db = getFirebaseAdminDb();
    const barRef = db.collection('bars').doc(barId);
    const snap = await barRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const bar = snap.data() as {
      name?: string;
      email?: string;
      stripe?: { customerId?: string };
    };

    if (!bar.email) {
      return NextResponse.json({ error: 'Bar is missing email' }, { status: 400 });
    }

    const stripe = getStripeServer();
    let customerId = bar.stripe?.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: bar.email,
        metadata: { barId },
      });
      customerId = customer.id;
      await barRef.set(
        {
          stripe: { customerId },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}/admin?checkout=success`,
      cancel_url: `${appBaseUrl}/admin/super/bars/${barId}?checkout=cancel`,
      metadata: { barId },
      subscription_data: { metadata: { barId } },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe session missing url' }, { status: 500 });
    }

    await sendStartSubscriptionEmail({
      to: bar.email,
      barName: bar.name ?? 'baren din',
      checkoutUrl: session.url,
    });

    await barRef.set(
      {
        billingEnabled: true,
        stripe: { customerId, priceId },
        lastBillingEmailSentAt: FieldValue.serverTimestamp(),
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
