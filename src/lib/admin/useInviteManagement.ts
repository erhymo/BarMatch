'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useToast } from '@/contexts/ToastContext';
import { asRecord } from '@/lib/utils/unknown';
import { tsToMs } from '@/lib/utils/time';

export type InviteRow = {
  id: string;
  email?: string;
  trialDays?: number;
  status?: string;
  expiresAt?: unknown;
  createdAt?: unknown;
  lastSentAt?: unknown;
  resendCount?: number;
};

export function fmtDateTime(v: unknown) {
  const ms = tsToMs(v);
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('nb-NO');
  } catch {
    return new Date(ms).toISOString();
  }
}

export function fmtInviteStatus(status: unknown): string {
  const s = typeof status === 'string' ? status : 'unknown';
  if (s === 'pending') return 'Venter';
  if (s === 'expired') return 'Utløpt';
  if (s === 'cancelled') return 'Avbrutt';
  if (s === 'completed') return 'Brukt';
  return s;
}

export function useInviteManagement(user: User | null, isSuperadmin: boolean) {
  const { showToast } = useToast();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTrialDays, setInviteTrialDays] = useState<number>(14);

  const refreshInvites = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load invites (${res.status})`);
      const data = (await res.json()) as { invites?: InviteRow[] };
      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!user || !isSuperadmin) return;
    setBusy(true);
    void refreshInvites().finally(() => setBusy(false));
  }, [user, isSuperadmin, refreshInvites]);

  const countLabel = useMemo(
    () => (busy ? 'Laster invitasjoner…' : `${invites.length} invitasjoner`),
    [busy, invites.length],
  );

  const createInvite = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const email = inviteEmail.trim().toLowerCase();
      if (!email.includes('@')) throw new Error('Ugyldig e-post');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trialDays: inviteTrialDays }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      const msg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(msg || `Feil (${res.status})`);
      setInviteEmail('');
      showToast({ description: 'Invitasjon sendt.', variant: 'success' });
      await refreshInvites();
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user, inviteEmail, inviteTrialDays, refreshInvites, showToast]);

  const resend = useCallback(async (inviteId: string) => {
    if (!user) return;
    setBusyActionId(inviteId);
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
      showToast({ description: 'Invitasjon sendt på nytt.', variant: 'success' });
      await refreshInvites();
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusyActionId(null);
    }
  }, [user, refreshInvites, showToast]);

  const cancel = useCallback(async (inviteId: string) => {
    if (!user) return;
    if (!confirm('Avbryt invitasjon?')) return;
    setBusyActionId(inviteId);
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
      showToast({ description: 'Invitasjon avbrutt.', variant: 'success' });
      await refreshInvites();
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusyActionId(null);
    }
  }, [user, refreshInvites, showToast]);



  const deleteInvite = useCallback(async (inviteId: string) => {
    if (!user) return;
    if (!confirm('Fjerne invitasjon helt? Dette sletter den fra listen og databasen.')) return;
    setBusyActionId(inviteId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      const msg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(msg || `Feil (${res.status})`);
      showToast({ description: 'Invitasjon fjernet.', variant: 'success' });
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusyActionId(null);
    }
  }, [user, showToast]);

  const copyLink = useCallback(async (inviteId: string) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/onboard?token=${inviteId}`;
      await navigator.clipboard.writeText(link);
      showToast({ description: 'Lenke kopiert.', variant: 'success' });
    } catch {
      showToast({ description: 'Kunne ikke kopiere lenke.', variant: 'error' });
    }
  }, [showToast]);

  return {
    invites,
    busy,
    busyActionId,
    countLabel,
    inviteEmail,
    setInviteEmail,
    inviteTrialDays,
    setInviteTrialDays,
    createInvite,
    resend,
    cancel,
    deleteInvite,
    copyLink,
    refresh: refreshInvites,
  };
}