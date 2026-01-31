import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { getStripeServer } from '@/lib/stripe/server';
import { sendPaymentFailedDay0 } from '@/lib/email/mailer';

export const runtime = 'nodejs';

function mapSubscriptionStatus(status: Stripe.Subscription.Status): 'active' | 'payment_failed' | 'canceled' {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'payment_failed';
  return 'canceled';
}

async function updateBarBilling(params: {
  barId: string;
  billingStatus: 'active' | 'payment_failed' | 'canceled';
  customerId?: string | null;
  subscriptionId?: string | null;
  extraUpdate?: Record<string, unknown>;
}) {
  const { barId, billingStatus, customerId, subscriptionId, extraUpdate } = params;
  const db = getFirebaseAdminDb();

  const update: Record<string, unknown> = {
    billingStatus,
    billingEnabled: billingStatus !== 'canceled',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (customerId) update['stripe.customerId'] = customerId;
  if (subscriptionId) update['stripe.subscriptionId'] = subscriptionId;
  if (extraUpdate) {
    for (const [k, v] of Object.entries(extraUpdate)) {
      update[k] = v;
    }
  }

  await db.collection('bars').doc(barId).set(update, { merge: true });
}

async function resolveBarId(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<{ barId: string | null; subscription?: Stripe.Subscription | null }> {
  const stripe = getStripeServer();
  const { subscriptionId, customerId } = params;

  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const barId = sub.metadata?.barId ?? null;
      if (barId) return { barId, subscription: sub };
    } catch (err) {
      console.error('Failed retrieving subscription for barId mapping:', subscriptionId, err);
    }
  }

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if ('deleted' in customer && customer.deleted) {
        return { barId: null, subscription: null };
      }
      const barId = customer.metadata?.barId ?? null;
      if (barId) return { barId, subscription: null };
    } catch (err) {
      console.error('Failed retrieving customer for barId mapping:', customerId, err);
    }
  }

  return { barId: null, subscription: null };
}

async function claimStripeEvent(params: {
  event: Stripe.Event;
}): Promise<{ shouldProcess: boolean }> {
  const { event } = params;
  const db = getFirebaseAdminDb();
  const ref = db.collection('stripeEvents').doc(event.id);

  const res = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data() as Record<string, unknown>;
      const status = typeof data.status === 'string' ? data.status : null;
      if (status === 'processed' || status === 'processing') {
        return { shouldProcess: false as const };
      }

      tx.set(
        ref,
        {
          type: event.type,
          status: 'processing',
          updatedAt: FieldValue.serverTimestamp(),
          attempts: FieldValue.increment(1),
        },
        { merge: true },
      );
      return { shouldProcess: true as const };
    }

    tx.create(ref, {
      type: event.type,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      attempts: 1,
    });
    return { shouldProcess: true as const };
  });

  return res;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripeServer();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid signature' },
      { status: 400 },
    );
  }

  // Idempotency guard: prevent duplicate side effects for the same Stripe event.
  try {
    const claim = await claimStripeEvent({ event });
    if (!claim.shouldProcess) {
      return NextResponse.json({ received: true, deduped: true });
    }
  } catch (err) {
    console.error('Failed claiming Stripe event for idempotency:', err);
    return NextResponse.json({ error: 'Idempotency check failed' }, { status: 500 });
  }

  const db = getFirebaseAdminDb();
  const eventRef = db.collection('stripeEvents').doc(event.id);
  let resolvedBarId: string | null = null;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const barId =
          session.metadata?.barId ??
          (typeof session.client_reference_id === 'string' && session.client_reference_id
            ? session.client_reference_id
            : null);
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

        if (!barId) break;
        resolvedBarId = barId;

        let billingStatus: 'active' | 'payment_failed' | 'canceled' = 'active';
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          billingStatus = mapSubscriptionStatus(sub.status);
        }

        await updateBarBilling({ barId, billingStatus, customerId, subscriptionId });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
        const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        const resolved = await resolveBarId({ subscriptionId: subscriptionId ?? null, customerId: customerId ?? null });
        if (!resolved.barId) break;
	      resolvedBarId = resolved.barId;

        const now = Date.now();
        const failedAt = Timestamp.fromMillis(now);
        const gracePeriodEndsAt = Timestamp.fromMillis(now + 14 * 24 * 60 * 60 * 1000);

        await updateBarBilling({
          barId: resolved.barId,
          billingStatus: 'payment_failed',
          customerId,
          subscriptionId: subscriptionId ?? null,
          extraUpdate: {
            'stripe.lastPaymentFailedAt': failedAt,
            'stripe.gracePeriodEndsAt': gracePeriodEndsAt,
            'stripe.reminders.day7SentAt': null,
          },
        });

        // Day-0 email (best effort).
        try {
          const db = getFirebaseAdminDb();
          const barSnap = await db.collection('bars').doc(resolved.barId).get();
          const bar = barSnap.data() as { email?: string; name?: string } | undefined;
          if (bar?.email) {
            await sendPaymentFailedDay0({ to: bar.email, barName: bar.name });
          }
        } catch (err) {
          console.error('Failed sending payment_failed email:', err);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
        const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        const resolved = await resolveBarId({ subscriptionId: subscriptionId ?? null, customerId: customerId ?? null });
        if (!resolved.barId) break;
	      resolvedBarId = resolved.barId;

        await updateBarBilling({
          barId: resolved.barId,
          billingStatus: 'active',
          customerId,
          subscriptionId: subscriptionId ?? null,
          extraUpdate: {
            'stripe.lastPaymentFailedAt': null,
            'stripe.gracePeriodEndsAt': null,
            'stripe.reminders.day7SentAt': null,
          },
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const barId = sub.metadata?.barId;
        if (!barId) break;
	      resolvedBarId = barId;

        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const billingStatus = mapSubscriptionStatus(sub.status);

        await updateBarBilling({
          barId,
          billingStatus,
          customerId,
          subscriptionId: sub.id,
          extraUpdate:
            event.type === 'customer.subscription.deleted'
              ? {
                  // If subscription is cancelled, hide from the map by default.
                  isVisible: false,
                  'stripe.gracePeriodEndsAt': null,
                  'stripe.lastPaymentFailedAt': null,
                  'stripe.reminders.day7SentAt': null,
                }
              : undefined,
        });
        break;
      }

      default:
        // ignore
        break;
    }

	  await eventRef.set(
	    {
	      status: 'processed',
	      processedAt: FieldValue.serverTimestamp(),
	      updatedAt: FieldValue.serverTimestamp(),
	      ...(resolvedBarId ? { barId: resolvedBarId } : {}),
	    },
	    { merge: true },
	  );
  } catch (err) {
    console.error('Stripe webhook handler failed:', err);
	  try {
	    await eventRef.set(
	      {
	        status: 'error',
	        updatedAt: FieldValue.serverTimestamp(),
	        error: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
	      },
	      { merge: true },
	    );
	  } catch (e2) {
	    console.error('Failed writing stripeEvents error status:', e2);
	  }
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
