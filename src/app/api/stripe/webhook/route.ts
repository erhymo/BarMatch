import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { getStripeServer } from '@/lib/stripe/server';

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
}) {
  const { barId, billingStatus, customerId, subscriptionId } = params;
  const db = getFirebaseAdminDb();

  const update: Record<string, unknown> = {
    billingStatus,
    billingEnabled: billingStatus !== 'canceled',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (customerId) update['stripe.customerId'] = customerId;
  if (subscriptionId) update['stripe.subscriptionId'] = subscriptionId;

  await db.collection('bars').doc(barId).set(update, { merge: true });
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const barId = session.metadata?.barId;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

        if (!barId) break;

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
        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const barId = sub.metadata?.barId;
        if (!barId) break;

        await updateBarBilling({
          barId,
          billingStatus: 'payment_failed',
          customerId,
          subscriptionId,
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const barId = sub.metadata?.barId;
        if (!barId) break;

        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const billingStatus = mapSubscriptionStatus(sub.status);

        await updateBarBilling({
          barId,
          billingStatus,
          customerId,
          subscriptionId: sub.id,
        });
        break;
      }

      default:
        // ignore
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler failed:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
