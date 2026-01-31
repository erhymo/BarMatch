'use client';

import { getBillingText, getVisibilityText } from '@/lib/admin/statusText';

export function StatusPill(props:
  | { kind: 'visibility'; isVisible?: unknown }
  | { kind: 'billing'; billingEnabled?: unknown; billingStatus?: unknown; gracePeriodEndsAt?: unknown }) {
  if (props.kind === 'visibility') {
    const isVisible = Boolean(props.isVisible);
    const text = getVisibilityText(isVisible);
    const cls = isVisible
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300';
    return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${cls}`}>{text}</span>;
  }

  const billingEnabled = Boolean(props.billingEnabled);
  const status = typeof props.billingStatus === 'string' ? props.billingStatus : 'unknown';
  const text = getBillingText(props);
  const cls =
    !billingEnabled || status === 'canceled'
      ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
      : status === 'active'
        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
        : status === 'payment_failed'
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300';

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${cls}`}>{text}</span>;
}
