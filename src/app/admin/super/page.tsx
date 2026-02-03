'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { StatusPill } from '@/components/admin/StatusPill';
import { asRecord } from '@/lib/utils/unknown';
import { tsToMs } from '@/lib/utils/time';

type BarRow = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
  stripe?: { gracePeriodEndsAt?: unknown };
};

type InviteRow = {
  id: string;
  email?: string;
  trialDays?: number;
  status?: string;
  expiresAt?: unknown;
  createdAt?: unknown;
  lastSentAt?: unknown;
  resendCount?: number;
};

function fmtDateTime(v: unknown) {
  const ms = tsToMs(v);
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('nb-NO');
  } catch {
    return new Date(ms).toISOString();
  }
}

function fmtInviteStatus(status: unknown): string {
  const s = typeof status === 'string' ? status : 'unknown';
  if (s === 'pending') return 'Venter';
  if (s === 'expired') return 'Utløpt';
  if (s === 'cancelled') return 'Avbrutt';
  if (s === 'completed') return 'Brukt';
  return s;
}

function isBillingOk(bar: BarRow): boolean {
  return Boolean(bar.billingEnabled) && bar.billingStatus === 'active';
}

function isBillingFailed(bar: BarRow): boolean {
  return bar.billingStatus === 'payment_failed';
}

function isInGrace(bar: BarRow): boolean {
  const ms = tsToMs(bar.stripe?.gracePeriodEndsAt);
  if (!ms) return false;
  return ms > Date.now();
}

export default function SuperAdminDashboard() {
  const { user, me } = useRequireAdminRole(['superadmin']);
  const [bars, setBars] = useState<BarRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  const [busyBars, setBusyBars] = useState(false);
  const [busyInvites, setBusyInvites] = useState(false);
  const [busyInviteActionId, setBusyInviteActionId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTrialDays, setInviteTrialDays] = useState<number>(14);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

	  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
	  const [billingFilter, setBillingFilter] = useState<'all' | 'ok' | 'failed' | 'grace'>('all');
	  const [searchTerm, setSearchTerm] = useState('');
	  const [sortMode, setSortMode] = useState<'name' | 'billing'>('name');
	  const [busyBarActionId, setBusyBarActionId] = useState<string | null>(null);

	  const filteredBars = useMemo(() => {
	    let result = bars.filter((b) => {
	      if (visibilityFilter === 'visible' && !b.isVisible) return false;
	      if (visibilityFilter === 'hidden' && b.isVisible) return false;

	      if (billingFilter === 'ok' && !isBillingOk(b)) return false;
	      if (billingFilter === 'failed' && !isBillingFailed(b)) return false;
	      if (billingFilter === 'grace' && !isInGrace(b)) return false;

	      return true;
	    });

	    const q = searchTerm.trim().toLowerCase();
	    if (q) {
	      result = result.filter((b) => {
	        const name = (b.name ?? '').toLowerCase();
	        const email = (b.email ?? '').toLowerCase();
	        const id = b.id.toLowerCase();
	        return name.includes(q) || email.includes(q) || id.includes(q);
	      });
	    }

	    const sorted = [...result];
	    if (sortMode === 'name') {
	      sorted.sort((a, b) => {
	        const an = (a.name ?? a.email ?? a.id).toLowerCase();
	        const bn = (b.name ?? b.email ?? b.id).toLowerCase();
	        if (an < bn) return -1;
	        if (an > bn) return 1;
	        return 0;
	      });
	    } else if (sortMode === 'billing') {
	      const score = (bar: BarRow): number => {
	        if (isBillingFailed(bar)) return 0; // problemer først
	        if (isInGrace(bar)) return 1; // deretter grace
	        if (isBillingOk(bar)) return 2; // så OK
	        return 3; // resten
	      };
	      sorted.sort((a, b) => {
	        const sa = score(a);
	        const sb = score(b);
	        if (sa !== sb) return sa - sb;
	        const an = (a.name ?? a.email ?? a.id).toLowerCase();
	        const bn = (b.name ?? b.email ?? b.id).toLowerCase();
	        if (an < bn) return -1;
	        if (an > bn) return 1;
	        return 0;
	      });
	    }

	    return sorted;
	  }, [bars, visibilityFilter, billingFilter, searchTerm, sortMode]);

  const inviteCountLabel = useMemo(
    () => (busyInvites ? 'Laster invitasjoner…' : `${invites.length} invitasjoner`),
    [busyInvites, invites.length],
  );

	  const barCountLabel = useMemo(() => {
	    if (busyBars) return 'Laster barer…';
	    if (bars.length === 0) return 'Ingen barer';
	    if (filteredBars.length === bars.length) return `${bars.length} barer`;
	    return `${filteredBars.length} av ${bars.length} barer`;
	  }, [busyBars, bars.length, filteredBars.length]);

	  const kpi = useMemo(
	    () => {
	      let active = 0;
	      let failed = 0;
	      let grace = 0;
	      for (const bar of bars) {
	        if (isBillingOk(bar)) active += 1;
	        if (isBillingFailed(bar)) failed += 1;
	        if (isInGrace(bar)) grace += 1;
	      }
	      const pendingInvites = invites.filter((inv) => inv.status === 'pending').length;
	      return { active, failed, grace, pendingInvites };
	    },
	    [bars, invites],
	  );

  useEffect(() => {
    const run = async () => {
      if (!user || !me || me.role !== 'superadmin') return;
      setBusyBars(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/bars', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load bars (${res.status})`);
        const data = (await res.json()) as { bars: BarRow[] };
        setBars(data.bars ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ukjent feil');
      } finally {
        setBusyBars(false);
      }
    };
    void run();
  }, [user, me]);

  useEffect(() => {
    const run = async () => {
      if (!user || !me || me.role !== 'superadmin') return;
      setBusyInvites(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/invites', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load invites (${res.status})`);
        const data = (await res.json()) as { invites?: InviteRow[] };
        setInvites(Array.isArray(data.invites) ? data.invites : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ukjent feil');
      } finally {
        setBusyInvites(false);
      }
    };
    void run();
  }, [user, me]);

  const createInvite = async () => {
    if (!user) return;
    setNotice(null);
    setError(null);
    setBusyInvites(true);
    try {
      const email = inviteEmail.trim().toLowerCase();
      if (!email.includes('@')) throw new Error('Ugyldig e-post');

      const token = await user.getIdToken();
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, trialDays: inviteTrialDays }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      const msg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(msg || `Feil (${res.status})`);

      setInviteEmail('');
      setNotice('Invitasjon sendt.');

      // Refresh list
      const res2 = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw2: unknown = await res2.json().catch(() => ({}));
      const data2 = asRecord(raw2);
      if (res2.ok && Array.isArray(data2?.invites)) setInvites(data2.invites as InviteRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
    } finally {
      setBusyInvites(false);
    }
  };

  const resendInvite = async (inviteId: string) => {
    if (!user) return;
    setNotice(null);
    setError(null);
    setBusyInviteActionId(inviteId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/invites/${inviteId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      const msg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(msg || `Feil (${res.status})`);
      setNotice('Invitasjon sendt på nytt.');

      const res2 = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw2: unknown = await res2.json().catch(() => ({}));
      const data2 = asRecord(raw2);
      if (res2.ok && Array.isArray(data2?.invites)) setInvites(data2.invites as InviteRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
    } finally {
      setBusyInviteActionId(null);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    if (!user) return;
    if (!confirm('Avbryt invitasjon?')) return;
    setNotice(null);
    setError(null);
    setBusyInviteActionId(inviteId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/invites/${inviteId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      const msg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(msg || `Feil (${res.status})`);
      setNotice('Invitasjon avbrutt.');

      const res2 = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw2: unknown = await res2.json().catch(() => ({}));
      const data2 = asRecord(raw2);
      if (res2.ok && Array.isArray(data2?.invites)) setInvites(data2.invites as InviteRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
    } finally {
      setBusyInviteActionId(null);
    }
  };

  const copyInviteLink = async (inviteId: string) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/onboard?token=${inviteId}`;
      await navigator.clipboard.writeText(link);
      setNotice('Lenke kopiert.');
    } catch {
      setNotice('Kunne ikke kopiere lenke.');
    }
  };

	  const toggleBarVisibility = async (bar: BarRow) => {
	    if (!user) return;
	    const next = !bar.isVisible;
	    setNotice(null);
	    setError(null);
	    setBusyBarActionId(bar.id);
	    try {
	      const token = await user.getIdToken();
	      const res = await fetch(`/api/admin/bars/${bar.id}`, {
	        method: 'PATCH',
	        headers: {
	          Authorization: `Bearer ${token}`,
	          'Content-Type': 'application/json',
	        },
	        body: JSON.stringify({ isVisible: next }),
	      });
	      const raw: unknown = await res.json().catch(() => ({}));
	      const data = asRecord(raw);
	      if (!res.ok) {
	        const msg = typeof data?.error === 'string' ? data.error : '';
	        throw new Error(msg || `Feil (${res.status})`);
	      }
	      setBars((prev) => prev.map((b) => (b.id === bar.id ? { ...b, isVisible: next } : b)));
	    } catch (e) {
	      setError(e instanceof Error ? e.message : 'Ukjent feil');
	    } finally {
	      setBusyBarActionId(null);
	    }
	  };

	  const billingOnForBar = async (bar: BarRow) => {
	    if (!user) return;
	    setNotice(null);
	    setError(null);
	    setBusyBarActionId(bar.id);
	    try {
	      const token = await user.getIdToken();
	      const res = await fetch(`/api/admin/bars/${bar.id}/billing-on`, {
	        method: 'POST',
	        headers: { Authorization: `Bearer ${token}` },
	      });
	      const raw: unknown = await res.json().catch(() => ({}));
	      const data = asRecord(raw);
	      if (!res.ok) {
	        const msg = typeof data?.error === 'string' ? data.error : '';
	        throw new Error(msg || `Feil (${res.status})`);
	      }
	      setBars((prev) => prev.map((b) => (b.id === bar.id ? { ...b, billingEnabled: true } : b)));
	      const checkoutUrl = typeof data?.checkoutUrl === 'string' ? (data.checkoutUrl as string) : '';
	      if (checkoutUrl && typeof window !== 'undefined') {
	        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
	      }
	    } catch (e) {
	      setError(e instanceof Error ? e.message : 'Ukjent feil');
	    } finally {
	      setBusyBarActionId(null);
	    }
	  };

	  const billingOffForBar = async (bar: BarRow) => {
	    if (!user) return;
	    if (!confirm('Deaktivere betaling for denne baren?')) return;
	    setNotice(null);
	    setError(null);
	    setBusyBarActionId(bar.id);
	    try {
	      const token = await user.getIdToken();
	      const res = await fetch(`/api/admin/bars/${bar.id}/billing-off`, {
	        method: 'POST',
	        headers: { Authorization: `Bearer ${token}` },
	      });
	      const raw: unknown = await res.json().catch(() => ({}));
	      const data = asRecord(raw);
	      if (!res.ok) {
	        const msg = typeof data?.error === 'string' ? data.error : '';
	        throw new Error(msg || `Feil (${res.status})`);
	      }
	      setBars((prev) =>
	        prev.map((b) =>
	          b.id === bar.id
	            ? { ...b, billingEnabled: false, billingStatus: 'canceled', isVisible: false }
	            : b,
	        ),
	      );
	    } catch (e) {
	      setError(e instanceof Error ? e.message : 'Ukjent feil');
	    } finally {
	      setBusyBarActionId(null);
	    }
	  };

	  return (
	    <div>
	      <div className="mb-6">
	        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Superadmin</h1>
	        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Oversikt over barer og invitasjoner.</p>
	      </div>

	      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
	            Aktive barer
	          </div>
	          <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{kpi.active}</div>
	        </div>
	        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
	            Betalingsproblem
	          </div>
	          <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{kpi.failed}</div>
	        </div>
	        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
	            I grace-periode
	          </div>
	          <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{kpi.grace}</div>
	        </div>
	        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
	            Ventende invitasjoner
	          </div>
	          <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{kpi.pendingInvites}</div>
	        </div>
	      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Inviter ny bar</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_160px]">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="E-post"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />

          <select
            value={inviteTrialDays}
            onChange={(e) => setInviteTrialDays(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
	            <option value={0}>Prøveperiode: 0 dager</option>
	            <option value={7}>Prøveperiode: 7 dager</option>
	            <option value={14}>Prøveperiode: 14 dager</option>
	            <option value={30}>Prøveperiode: 30 dager</option>
          </select>

          <button
            type="button"
            disabled={busyInvites || !inviteEmail.trim()}
            onClick={createInvite}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {busyInvites ? 'Sender…' : 'Send invitasjon'}
          </button>
        </div>

        {notice && (
          <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {inviteCountLabel}
        </div>

        {/* Mobile-first: cards on small screens, table on md+ */}
        <div className="md:hidden">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {invites.map((inv) => (
              <div key={inv.id} className="px-4 py-4">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{inv.email ?? '—'}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{inv.id}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {fmtInviteStatus(inv.status)}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
	                    Prøveperiode: {typeof inv.trialDays === 'number' ? `${inv.trialDays} dager` : '—'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Utløper: {fmtDateTime(inv.expiresAt)}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Sist sendt: {fmtDateTime(inv.lastSentAt)}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void copyInviteLink(inv.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    Kopier lenke
                  </button>
                  <button
                    type="button"
                    disabled={busyInviteActionId === inv.id || inv.status !== 'pending'}
                    onClick={() => void resendInvite(inv.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    Send på nytt
                  </button>
                  <button
                    type="button"
                    disabled={busyInviteActionId === inv.id || inv.status !== 'pending'}
                    onClick={() => void cancelInvite(inv.id)}
                    className="col-span-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ))}

            {invites.length === 0 && !busyInvites && (
              <div className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400">Ingen invitasjoner enda.</div>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500 dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">E-post</th>
	                <th className="px-4 py-3 font-medium">Prøveperiode (dager)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Utløper</th>
                <th className="px-4 py-3 font-medium">Sist sendt</th>
                <th className="px-4 py-3 font-medium">Handling</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{inv.email ?? '—'}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{inv.id}</div>
                  </td>
                  <td className="px-4 py-3">{typeof inv.trialDays === 'number' ? inv.trialDays : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {fmtInviteStatus(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{fmtDateTime(inv.expiresAt)}</td>
                  <td className="px-4 py-3">{fmtDateTime(inv.lastSentAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyInviteLink(inv.id)}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      >
                        Kopier lenke
                      </button>

                      <button
                        type="button"
                        disabled={busyInviteActionId === inv.id || inv.status !== 'pending'}
                        onClick={() => void resendInvite(inv.id)}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      >
                        Send på nytt
                      </button>

                      <button
                        type="button"
                        disabled={busyInviteActionId === inv.id || inv.status !== 'pending'}
                        onClick={() => void cancelInvite(inv.id)}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      >
                        Avbryt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {invites.length === 0 && !busyInvites && (
                <tr>
                  <td className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400" colSpan={6}>
                    Ingen invitasjoner enda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

	      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	        <div className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
	          {barCountLabel}
	        </div>

	        <div className="border-b border-zinc-200 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
	          <div className="flex flex-wrap gap-3">
	            <div className="flex flex-wrap items-center gap-2">
	              <span className="font-medium">Synlighet:</span>
	              <div className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
	                <button
	                  type="button"
	                  onClick={() => setVisibilityFilter('all')}
	                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
	                    visibilityFilter === 'all'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  Alle
	                </button>
	                <button
	                  type="button"
	                  onClick={() => setVisibilityFilter('visible')}
	                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium ${
	                    visibilityFilter === 'visible'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  Synlige
	                </button>
	                <button
	                  type="button"
	                  onClick={() => setVisibilityFilter('hidden')}
	                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium ${
	                    visibilityFilter === 'hidden'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  Skjulte
	                </button>
	              </div>
	            </div>

		            <div className="flex flex-wrap items-center gap-2">
		              <span className="font-medium">Betaling:</span>
	              <div className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
	                <button
	                  type="button"
	                  onClick={() => setBillingFilter('all')}
	                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
	                    billingFilter === 'all'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  Alle
	                </button>
	                <button
	                  type="button"
	                  onClick={() => setBillingFilter('ok')}
	                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium ${
	                    billingFilter === 'ok'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  OK
	                </button>
	                <button
	                  type="button"
	                  onClick={() => setBillingFilter('failed')}
	                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium ${
	                    billingFilter === 'failed'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  Feilet
	                </button>
	                <button
	                  type="button"
	                  onClick={() => setBillingFilter('grace')}
	                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium ${
	                    billingFilter === 'grace'
	                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
	                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
	                  }`}
	                >
	                  I grace-periode
	                </button>
		              </div>
		            </div>

		            <div className="flex flex-wrap items-center gap-2">
		              <span className="font-medium">Søk:</span>
		              <input
		                value={searchTerm}
		                onChange={(e) => setSearchTerm(e.target.value)}
		                placeholder="Navn, e-post eller ID"
		                className="w-40 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
		              />
		            </div>

		            <div className="flex flex-wrap items-center gap-2">
		              <span className="font-medium">Sorter:</span>
		              <div className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
		                <button
		                  type="button"
		                  onClick={() => setSortMode('name')}
		                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
		                    sortMode === 'name'
		                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
		                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
		                  }`}
		                >
		                  Navn
		                </button>
		                <button
		                  type="button"
		                  onClick={() => setSortMode('billing')}
		                  className={`ml-1 rounded-full px-2.5 py-1 text-xs font-medium ${
		                    sortMode === 'billing'
		                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
		                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
		                  }`}
		                >
		                  Betaling
		                </button>
		              </div>
		            </div>
	          </div>
	        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

	        <div className="md:hidden">
	          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
	            {filteredBars.map((b) => {
	              const isBusy = busyBarActionId === b.id || busyBars;
	              const isVisible = Boolean(b.isVisible);
	              const billingEnabled = Boolean(b.billingEnabled);
	              const visibilityLabel = isVisible ? 'Skjul' : 'Gjør synlig';
	              const billingLabel = billingEnabled ? 'Deaktiver betaling' : 'Aktiver betaling';
	              return (
	                <div key={b.id} className="px-4 py-4">
	                  <Link
	                    href={`/admin/super/bars/${b.id}`}
	                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
	                  >
	                    {b.name ?? b.id}
	                  </Link>
	                  {b.email && (
	                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>
	                  )}

	                  <div className="mt-3 flex flex-wrap items-center gap-2">
	                    <StatusPill kind="visibility" isVisible={b.isVisible} />
	                    <StatusPill
	                      kind="billing"
	                      billingEnabled={b.billingEnabled}
	                      billingStatus={b.billingStatus}
	                      gracePeriodEndsAt={b.stripe?.gracePeriodEndsAt}
	                    />
	                  </div>

	                  <div className="mt-4 grid grid-cols-2 gap-2">
	                    <button
	                      type="button"
	                      disabled={isBusy}
	                      onClick={() => void toggleBarVisibility(b)}
	                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
	                    >
	                      {visibilityLabel}
	                    </button>
	                    <button
	                      type="button"
	                      disabled={isBusy}
	                      onClick={() =>
	                        void (billingEnabled ? billingOffForBar(b) : billingOnForBar(b))
	                      }
	                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
	                    >
	                      {billingLabel}
	                    </button>
	                  </div>
	                </div>
	              );
	            })}
	          </div>
	        </div>

	        <div className="hidden md:block overflow-x-auto">
	          <table className="w-full text-sm">
	            <thead className="text-left text-zinc-500 dark:text-zinc-400">
	              <tr className="border-b border-zinc-200 dark:border-zinc-800">
	                <th className="px-4 py-3 font-medium">Bar</th>
	                <th className="px-4 py-3 font-medium">Synlighet</th>
	                <th className="px-4 py-3 font-medium">Betaling</th>
	                <th className="px-4 py-3 font-medium">Handling</th>
	              </tr>
	            </thead>
	            <tbody>
	              {filteredBars.map((b) => {
	                const isBusy = busyBarActionId === b.id || busyBars;
	                const isVisible = Boolean(b.isVisible);
	                const billingEnabled = Boolean(b.billingEnabled);
	                const visibilityLabel = isVisible ? 'Skjul' : 'Gjør synlig';
	                const billingLabel = billingEnabled ? 'Deaktiver betaling' : 'Aktiver betaling';
	                return (
	                  <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-900">
	                    <td className="px-4 py-3">
	                      <Link
	                        href={`/admin/super/bars/${b.id}`}
	                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
	                      >
	                        {b.name ?? b.id}
	                      </Link>
	                      {b.email && (
	                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>
	                      )}
	                    </td>
	                    <td className="px-4 py-3">
	                      <StatusPill kind="visibility" isVisible={b.isVisible} />
	                    </td>
	                    <td className="px-4 py-3">
	                      <StatusPill
	                        kind="billing"
	                        billingEnabled={b.billingEnabled}
	                        billingStatus={b.billingStatus}
	                        gracePeriodEndsAt={b.stripe?.gracePeriodEndsAt}
	                      />
	                    </td>
	                    <td className="px-4 py-3">
	                      <div className="flex flex-wrap gap-2">
	                        <button
	                          type="button"
	                          disabled={isBusy}
	                          onClick={() => void toggleBarVisibility(b)}
	                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
	                        >
	                          {visibilityLabel}
	                        </button>
	                        <button
	                          type="button"
	                          disabled={isBusy}
	                          onClick={() =>
	                            void (billingEnabled ? billingOffForBar(b) : billingOnForBar(b))
	                          }
	                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
	                        >
	                          {billingLabel}
	                        </button>
	                      </div>
	                    </td>
	                  </tr>
	                );
	              })}
	            </tbody>
	          </table>
	        </div>
      </div>
    </div>
  );
}
