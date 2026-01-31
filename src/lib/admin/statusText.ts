import { daysRemaining, tsToMs } from '@/lib/utils/time';

export function getVisibilityText(isVisible: unknown): 'Synlig i appen' | 'Skjult' {
  return Boolean(isVisible) ? 'Synlig i appen' : 'Skjult';
}

export function getBillingText(params: {
  billingEnabled?: unknown;
  billingStatus?: unknown;
  gracePeriodEndsAt?: unknown;
}): string {
  const billingEnabled = Boolean(params.billingEnabled);
  if (!billingEnabled) return 'Betaling deaktivert';

  const billingStatus = typeof params.billingStatus === 'string' ? params.billingStatus : 'unknown';
  if (billingStatus === 'active') return 'Aktiv';
  if (billingStatus === 'canceled') return 'Kansellert';
  if (billingStatus === 'payment_failed') {
    const endMs = tsToMs(params.gracePeriodEndsAt);
    if (typeof endMs === 'number') {
      const d = daysRemaining(endMs);
      if (d > 0) return `Betalingsproblem – vises i ${d} ${d === 1 ? 'dag' : 'dager'}`;
    }
    return 'Betalingsproblem';
  }
  return 'Ukjent';
}
