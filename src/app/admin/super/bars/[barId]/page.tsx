'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { StatusPill } from '@/components/admin/StatusPill';
import { getBillingText } from '@/lib/admin/statusText';

type BarDoc = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
  stripe?: { customerId?: string; subscriptionId?: string; gracePeriodEndsAt?: unknown };
};

export default function SuperAdminBarDetail() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams<{ barId: string }>();
  const barId = params?.barId;
  const { user, me } = useRequireAdminRole(['superadmin']);
  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => bar?.name ?? barId ?? 'Bar', [bar?.name, barId]);

  useEffect(() => {
    const run = async () => {
      if (!user || !me || me.role !== 'superadmin' || !barId) return;
      setBusy(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/bars/${barId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load bar (${res.status})`);
        setBar((await res.json()) as BarDoc);
      } catch (e) {
        showToast({
          title: 'Kunne ikke laste bar',
          description: e instanceof Error ? e.message : 'Ukjent feil',
          variant: 'error',
        });
      } finally {
        setBusy(false);
      }
    };
    void run();
  }, [user, me, barId, showToast]);

  const toggleVisible = async () => {
    if (!user || !barId || !bar) return;
    const next = !bar.isVisible;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${barId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVisible: next }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Failed to update (${res.status})`);
      }
      setBar({ ...bar, isVisible: next });
      showToast({
        title: 'Oppdatert',
        description: next ? 'Baren er nå synlig i appen.' : 'Baren er nå skjult.',
        variant: 'success',
      });
    } catch (e) {
      showToast({
        title: 'Feil',
        description: e instanceof Error ? e.message : 'Ukjent feil',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const billingOff = async () => {
    if (!user || !barId) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${barId}/billing-off`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Failed (${res.status})`);
      }
      setBar((prev) => (prev ? { ...prev, billingEnabled: false, billingStatus: 'canceled' } : prev));
      showToast({
        title: 'Betaling deaktivert',
        description: 'Abonnement er kansellert (hvis det fantes).',
        variant: 'success',
      });
    } catch (e) {
      showToast({
        title: 'Feil',
        description: e instanceof Error ? e.message : 'Ukjent feil',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const billingOn = async () => {
    if (!user || !barId) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${barId}/billing-on`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);

      setBar((prev) => (prev ? { ...prev, billingEnabled: true } : prev));
      showToast({
        title: 'Betaling aktivert',
        description: 'Checkout-lenke er sendt på e-post til baren.',
        variant: 'success',
      });

      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      showToast({
        title: 'Feil',
        description: e instanceof Error ? e.message : 'Ukjent feil',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!barId) return null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {bar?.email ?? '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/super')}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Tilbake
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Synlighet</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Styr om baren vises i kartet.
          </p>
	          <div className="mt-3">
	            <StatusPill kind="visibility" isVisible={bar?.isVisible} />
	          </div>
          <button
            type="button"
            disabled={busy || !bar}
            onClick={toggleVisible}
	            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
	            {bar?.isVisible ? 'Skjul' : 'Gjør synlig'}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Betaling</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
	            Betaling og Stripe-status.
          </p>

	          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
	            <StatusPill
	              kind="billing"
	              billingEnabled={bar?.billingEnabled}
	              billingStatus={bar?.billingStatus}
	              gracePeriodEndsAt={bar?.stripe?.gracePeriodEndsAt}
	            />
	          </div>
	          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
	            Status:{' '}
	            <span className="font-medium">
	              {getBillingText({
	                billingEnabled: bar?.billingEnabled,
	                billingStatus: bar?.billingStatus,
	                gracePeriodEndsAt: bar?.stripe?.gracePeriodEndsAt,
	              })}
	            </span>
	          </p>

	          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={billingOn}
	              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
	              Aktiver betaling
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={billingOff}
	              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
	              Deaktiver betaling
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
