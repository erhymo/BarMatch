'use client';

import { StatusPill } from '@/components/admin/StatusPill';
import { getBillingText } from '@/lib/admin/statusText';
import type { BarDoc } from '@/lib/admin/bar/types';

interface BarBillingSectionProps {
  bar: BarDoc | null;
  busy: boolean;
  paymentFailed: boolean;
  graceDaysRemaining: number | null;
  graceActive: boolean;
  graceExpired: boolean;
  hasStripeCustomerId: boolean;
  visibilityBlockedReason: string | null;
  onToggleVisible: () => void;
  onUpdatePaymentCard: () => void;
}

export function BarBillingSection({
  bar, busy, paymentFailed, graceDaysRemaining, graceActive, graceExpired,
  hasStripeCustomerId, visibilityBlockedReason,
  onToggleVisible, onUpdatePaymentCard,
}: BarBillingSectionProps) {
  return (
    <>
      {paymentFailed && graceActive && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="font-medium">Betaling feilet</div>
          <div className="mt-1">
            Baren kan fortsatt være synlig i en kort periode.
            {typeof graceDaysRemaining === 'number'
              ? ` Vises i ${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'dag' : 'dager'}.`
              : ''}{' '}
            Oppdater betalingskort så snart som mulig.
          </div>
        </div>
      )}

      {paymentFailed && graceExpired && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="font-medium">Frist utløpt</div>
          <div className="mt-1">Baren kan ikke settes synlig før betaling er fikset.</div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Synlighet og betaling
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{bar?.name ?? '—'}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{bar?.email ?? '—'}</p>
          <div className="mt-3">
            <StatusPill kind="visibility" isVisible={bar?.isVisible} />
          </div>
          <button
            type="button"
            disabled={busy || !bar || (!bar?.isVisible && Boolean(visibilityBlockedReason))}
            onClick={onToggleVisible}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {bar?.isVisible ? 'Skjul' : 'Gjør synlig'}
          </button>
          {!bar?.isVisible && visibilityBlockedReason && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{visibilityBlockedReason}</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Betaling</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill kind="billing" billingEnabled={bar?.billingEnabled} billingStatus={bar?.billingStatus} gracePeriodEndsAt={bar?.stripe?.gracePeriodEndsAt} />
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Status: <span className="font-medium">{getBillingText({ billingEnabled: bar?.billingEnabled, billingStatus: bar?.billingStatus, gracePeriodEndsAt: bar?.stripe?.gracePeriodEndsAt })}</span>
          </p>
          <button
            type="button"
            disabled={busy || !bar}
            onClick={onUpdatePaymentCard}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            Oppdater betalingskort
          </button>
          {!hasStripeCustomerId && (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Vanligvis skjer første gangs registrering av kort via Stripe Checkout (onboarding-lenken du
              fikk). Hvis du ikke finner lenken, kan du også bruke knappen over for å åpne Stripe-portalen
              og legge inn eller oppdatere kortet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

