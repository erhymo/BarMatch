'use client';

import type { useInviteManagement } from '@/lib/admin/useInviteManagement';
import { fmtDateTime, fmtInviteStatus } from '@/lib/admin/useInviteManagement';

type InviteMgmt = ReturnType<typeof useInviteManagement>;

interface InviteSectionProps {
  mgmt: InviteMgmt;
}

function InviteForm({ mgmt }: InviteSectionProps) {
  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Inviter ny bar</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_160px]">
        <input
          value={mgmt.inviteEmail}
          onChange={(e) => mgmt.setInviteEmail(e.target.value)}
          placeholder="E-post"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        />
        <select
          value={mgmt.inviteTrialDays}
          onChange={(e) => mgmt.setInviteTrialDays(Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value={0}>Prøveperiode: 0 dager</option>
          <option value={7}>Prøveperiode: 7 dager</option>
          <option value={14}>Prøveperiode: 14 dager</option>
          <option value={30}>Prøveperiode: 30 dager</option>
        </select>
        <button
          type="button"
          disabled={mgmt.busy || !mgmt.inviteEmail.trim()}
          onClick={() => void mgmt.createInvite()}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {mgmt.busy ? 'Sender…' : 'Send invitasjon'}
        </button>
      </div>
    </div>
  );
}

function InviteActionButtons({ mgmt, invId, status }: { mgmt: InviteMgmt; invId: string; status?: string }) {
  const isBusy = mgmt.busyActionId === invId;
  const isPending = status === 'pending';
  const btnCls = 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';
  const deleteCls = 'rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-50 dark:border-red-900/50 dark:bg-zinc-950 dark:text-red-200';

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void mgmt.copyLink(invId)} className={btnCls}>
        Kopier lenke
      </button>
      <button type="button" disabled={isBusy || !isPending} onClick={() => void mgmt.resend(invId)} className={btnCls}>
        Send på nytt
      </button>
      <button type="button" disabled={isBusy || !isPending} onClick={() => void mgmt.cancel(invId)} className={btnCls}>
        Avbryt
      </button>
      <button type="button" disabled={isBusy} onClick={() => void mgmt.deleteInvite(invId)} className={deleteCls}>
        Fjern
      </button>
    </div>
  );
}

export function InviteSection({ mgmt }: InviteSectionProps) {
  return (
    <>
      <InviteForm mgmt={mgmt} />

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {mgmt.countLabel}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-900">
          {mgmt.invites.map((inv) => (
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
              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Utløper: {fmtDateTime(inv.expiresAt)}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Sist sendt: {fmtDateTime(inv.lastSentAt)}</div>
              <div className="mt-4">
                <InviteActionButtons mgmt={mgmt} invId={inv.id} status={inv.status} />
              </div>
            </div>
          ))}
          {mgmt.invites.length === 0 && !mgmt.busy && (
            <div className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400">Ingen invitasjoner enda.</div>
          )}
        </div>

        {/* Desktop table */}
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
              {mgmt.invites.map((inv) => (
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
                    <InviteActionButtons mgmt={mgmt} invId={inv.id} status={inv.status} />
                  </td>
                </tr>
              ))}
              {mgmt.invites.length === 0 && !mgmt.busy && (
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
    </>
  );
}

