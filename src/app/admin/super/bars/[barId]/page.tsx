'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { StatusPill } from '@/components/admin/StatusPill';
import { getBillingText } from '@/lib/admin/statusText';
import { tsToMs } from '@/lib/utils/time';

type BarDoc = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
  stripe?: { customerId?: string; subscriptionId?: string; gracePeriodEndsAt?: unknown };
};

type AuditLogEntry = {
  id: string;
  adminUid?: string;
  barId?: string | null;
  action?: string;
  details?: Record<string, unknown> | null;
  createdAt?: unknown;
};

function formatLogTime(value: unknown): string {
  const ms = tsToMs(value);
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('nb-NO');
  } catch {
    return new Date(ms).toISOString();
  }
}

function describeAction(action: unknown): string {
  const s = typeof action === 'string' ? action : '';
  if (!s) return 'Ukjent hendelse';
  if (s === 'billing.enable') return 'Superadmin aktiverte betaling';
  if (s === 'billing.disable') return 'Superadmin deaktiverte betaling';
  if (s === 'bar.visibility.on') return 'Synlighet skrudd PÅ';
  if (s === 'bar.visibility.off') return 'Synlighet skrudd AV';
  if (s === 'bar.profile.update') return 'Barprofil oppdatert';
  return s;
}

export default function SuperAdminBarDetail() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams<{ barId: string }>();
  const barId = params?.barId;
  const { user, me } = useRequireAdminRole(['superadmin']);
  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

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

	  useEffect(() => {
	    const run = async () => {
	      if (!user || !me || me.role !== 'superadmin' || !barId) return;
	      setLogsLoading(true);
	      setLogsError(null);
	      try {
	        const token = await user.getIdToken();
	        const res = await fetch(`/api/admin/bars/${barId}/audit-logs`, {
	          headers: { Authorization: `Bearer ${token}` },
	        });
	        if (!res.ok) throw new Error(`Failed to load aktivitetslogg (${res.status})`);
	        const data = (await res.json()) as { logs?: AuditLogEntry[] };
	        setLogs(Array.isArray(data.logs) ? data.logs : []);
	      } catch (e) {
	        setLogsError(e instanceof Error ? e.message : 'Ukjent feil');
	      } finally {
	        setLogsLoading(false);
	      }
	    };
	    void run();
	  }, [user, me, barId]);

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

	      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Aktivitetslogg</h2>
	        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
	          Endringer gjort for denne baren (nyeste øverst).
	        </p>

	        {logsError && (
	          <div className="mt-3 text-sm text-red-700 dark:text-red-300">{logsError}</div>
	        )}

	        {logsLoading && !logsError && logs.length === 0 && (
	          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Laster logg…</div>
	        )}

	        {!logsLoading && !logsError && logs.length === 0 && (
	          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
	            Ingen registrerte hendelser ennå.
	          </div>
	        )}

	        {logs.length > 0 && (
	          <div className="mt-4 space-y-3">
	            {logs.map((entry) => (
	              <div
	                key={entry.id}
	                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
	              >
	                <div className="flex items-center justify-between gap-3">
	                  <div className="text-zinc-900 dark:text-zinc-50">{describeAction(entry.action)}</div>
	                  <div className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
	                    {formatLogTime(entry.createdAt)}
	                  </div>
	                </div>
	              </div>
	            ))}
	          </div>
	        )}
	      </div>
	    </div>
	  );
	}
