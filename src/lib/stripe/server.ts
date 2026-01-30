import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripeServer() {
  if (stripeSingleton) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY env var');
  }
  stripeSingleton = new Stripe(key);
  return stripeSingleton;
}
