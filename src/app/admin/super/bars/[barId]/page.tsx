'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminMe } from '@/lib/admin/useAdminMe';
import { useToast } from '@/contexts/ToastContext';

type BarDoc = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
  stripe?: { customerId?: string; subscriptionId?: string };
};

export default function SuperAdminBarDetail() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams<{ barId: string }>();
  const barId = params?.barId;
  const { user, me, loading, roleOk } = useAdminMe(['superadmin']);
  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => bar?.name ?? barId ?? 'Bar', [bar?.name, barId]);

  useEffect(() => {
    if (!loading && (!user || !roleOk)) {
      router.replace('/admin');
    }
  }, [loading, user, roleOk, router]);

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
      if (!res.ok) throw new Error(`Failed to update (${res.status})`);
      setBar({ ...bar, isVisible: next });
      showToast({
        title: 'Oppdatert',
        description: `Synlighet er nå ${next ? 'PÅ' : 'AV'}.`,
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
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setBar((prev) => (prev ? { ...prev, billingEnabled: false, billingStatus: 'canceled' } : prev));
      showToast({
        title: 'Billing OFF',
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
        title: 'Billing ON',
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
          <button
            type="button"
            disabled={busy || !bar}
            onClick={toggleVisible}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
	            Sett {bar?.isVisible ? 'AV' : 'PÅ'}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Billing</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Billing ON/OFF + Stripe-status.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              billing: {bar?.billingEnabled ? 'ON' : 'OFF'}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              status: {bar?.billingStatus ?? 'unknown'}
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={billingOn}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Billing ON
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={billingOff}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Billing OFF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
