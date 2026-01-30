'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useAdminMe } from '@/lib/admin/useAdminMe';

type BarDoc = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
};

export default function BarOwnerDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, me, loading, roleOk } = useAdminMe(['bar_owner']);
  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !roleOk)) {
      router.replace('/admin');
    }
  }, [loading, user, roleOk, router]);

  useEffect(() => {
    const run = async () => {
      if (!user || !me || me.role !== 'bar_owner' || !me.barId) return;
      setBusy(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/bars/${me.barId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load bar (${res.status})`);
        setBar((await res.json()) as BarDoc);
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
    void run();
  }, [user, me, showToast]);

  const toggleVisible = async () => {
    if (!user || !me?.barId || !bar) return;
    const next = !bar.isVisible;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${me.barId}`, {
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Bar-panel</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Synlighet og billing-status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{bar?.name ?? '—'}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{bar?.email ?? '—'}</p>
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
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              billing: {bar?.billingEnabled ? 'ON' : 'OFF'}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              status: {bar?.billingStatus ?? 'unknown'}
            </span>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
	            Hvis billing er OFF, be superadmin om å aktivere abonnement.
          </p>
        </div>
      </div>
    </div>
  );
}
