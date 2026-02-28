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
    <section>
      {/* ── Alert banners ── */}
      {paymentFailed && graceActive && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="font-semibold">⚠️ Betaling feilet</div>
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
          <div className="font-semibold">🚫 Frist utløpt</div>
          <div className="mt-1">Baren kan ikke settes synlig før betaling er fikset.</div>
        </div>
      )}

      {/* ── Section header ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💳</span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Synlighet og betaling</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Visibility card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{bar?.name ?? '—'}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{bar?.email ?? '—'}</p>
          <div className="mt-3">
            <StatusPill kind="visibility" isVisible={bar?.isVisible} />
          </div>
          <button
            type="button"
            disabled={busy || !bar || (!bar?.isVisible && Boolean(visibilityBlockedReason))}
            onClick={onToggleVisible}
            className={`mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${
              bar?.isVisible
                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
            }`}
          >
            {bar?.isVisible ? 'Skjul baren' : '✦ Gjør synlig'}
          </button>
          {!bar?.isVisible && visibilityBlockedReason && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{visibilityBlockedReason}</p>
          )}
        </div>

        {/* Payment card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Betaling</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill kind="billing" billingEnabled={bar?.billingEnabled} billingStatus={bar?.billingStatus} gracePeriodEndsAt={bar?.stripe?.gracePeriodEndsAt} />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {getBillingText({ billingEnabled: bar?.billingEnabled, billingStatus: bar?.billingStatus, gracePeriodEndsAt: bar?.stripe?.gracePeriodEndsAt })}
          </p>
          <button
            type="button"
            disabled={busy || !bar}
            onClick={onUpdatePaymentCard}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-all duration-150 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Oppdater betalingskort
          </button>
          {!hasStripeCustomerId && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Første registrering skjer via onboarding-lenken. Bruk knappen over for Stripe-portalen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

