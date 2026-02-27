'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useToast } from '@/contexts/ToastContext';
import { asRecord } from '@/lib/utils/unknown';
import { tsToMs } from '@/lib/utils/time';

export type BarRow = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
  stripe?: { gracePeriodEndsAt?: unknown };
};

export function isBillingOk(bar: BarRow): boolean {
  return Boolean(bar.billingEnabled) && bar.billingStatus === 'active';
}

export function isBillingFailed(bar: BarRow): boolean {
  return bar.billingStatus === 'payment_failed';
}

export function isInGrace(bar: BarRow): boolean {
  const ms = tsToMs(bar.stripe?.gracePeriodEndsAt);
  if (!ms) return false;
  return ms > Date.now();
}

export type VisibilityFilter = 'all' | 'visible' | 'hidden';
export type BillingFilter = 'all' | 'ok' | 'failed' | 'grace';
export type SortMode = 'name' | 'billing';

export function useBarManagement(user: User | null, isSuperadmin: boolean) {
  const { showToast } = useToast();
  const [bars, setBars] = useState<BarRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const fetchBars = useCallback(async () => {
    if (!user || !isSuperadmin) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/bars', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load bars (${res.status})`);
      const data = (await res.json()) as { bars: BarRow[] };
      setBars(data.bars ?? []);
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user, isSuperadmin, showToast]);

  useEffect(() => { void fetchBars(); }, [fetchBars]);

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
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
    } else if (sortMode === 'billing') {
      const score = (bar: BarRow): number => {
        if (isBillingFailed(bar)) return 0;
        if (isInGrace(bar)) return 1;
        if (isBillingOk(bar)) return 2;
        return 3;
      };
      sorted.sort((a, b) => {
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        const an = (a.name ?? a.email ?? a.id).toLowerCase();
        const bn = (b.name ?? b.email ?? b.id).toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
    }
    return sorted;
  }, [bars, visibilityFilter, billingFilter, searchTerm, sortMode]);

  const barCountLabel = useMemo(() => {
    if (busy) return 'Laster barer…';
    if (bars.length === 0) return 'Ingen barer';
    if (filteredBars.length === bars.length) return `${bars.length} barer`;
    return `${filteredBars.length} av ${bars.length} barer`;
  }, [busy, bars.length, filteredBars.length]);

  const toggleVisibility = useCallback(async (bar: BarRow) => {
    if (!user) return;
    const next = !bar.isVisible;
    setBusyActionId(bar.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${bar.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: next }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Feil (${res.status})`);
      }
      setBars((prev) => prev.map((b) => (b.id === bar.id ? { ...b, isVisible: next } : b)));
      showToast({ description: next ? 'Baren er nå synlig.' : 'Baren er nå skjult.', variant: 'success' });
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusyActionId(null);
    }
  }, [user, showToast]);



  const billingOn = useCallback(async (bar: BarRow) => {
    if (!user) return;
    setBusyActionId(bar.id);
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
      showToast({ description: 'Betaling aktivert.', variant: 'success' });
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusyActionId(null);
    }
  }, [user, showToast]);

  const billingOff = useCallback(async (bar: BarRow) => {
    if (!user) return;
    if (!confirm('Deaktivere betaling for denne baren?')) return;
    setBusyActionId(bar.id);
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
      showToast({ description: 'Betaling deaktivert.', variant: 'success' });
    } catch (e) {
      showToast({ description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusyActionId(null);
    }
  }, [user, showToast]);

  return {
    bars,
    filteredBars,
    busy,
    busyActionId,
    barCountLabel,
    visibilityFilter,
    setVisibilityFilter,
    billingFilter,
    setBillingFilter,
    searchTerm,
    setSearchTerm,
    sortMode,
    setSortMode,
    toggleVisibility,
    billingOn,
    billingOff,
    refresh: fetchBars,
  };
}