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

  const inviteCountLabel = useMemo(
    () => (busyInvites ? 'Laster invitasjoner…' : `${invites.length} invitasjoner`),
    [busyInvites, invites.length],
  );

  const barCountLabel = useMemo(() => (busyBars ? 'Laster barer…' : `${bars.length} barer`), [busyBars, bars.length]);

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Superadmin</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Oversikt over barer (alfabetisk).
        </p>
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

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        <div className="md:hidden">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {bars.map((b) => (
              <div key={b.id} className="px-4 py-4">
                <Link
                  href={`/admin/super/bars/${b.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {b.name ?? b.id}
                </Link>
                {b.email && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill kind="visibility" isVisible={b.isVisible} />
                  <StatusPill
                    kind="billing"
                    billingEnabled={b.billingEnabled}
                    billingStatus={b.billingStatus}
                    gracePeriodEndsAt={b.stripe?.gracePeriodEndsAt}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500 dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Bar</th>
                <th className="px-4 py-3 font-medium">Synlighet</th>
                <th className="px-4 py-3 font-medium">Betaling</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((b) => (
                <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/super/bars/${b.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {b.name ?? b.id}
                    </Link>
                    {b.email && <div className="text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
