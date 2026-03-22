'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { daysRemaining, tsToMs } from '@/lib/utils/time';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getFixtureProvider } from '@/lib/providers/fixtures';
import { ALL_LEAGUE_KEYS } from '@/lib/config/competitions';
import type { BarDoc, BarMessage } from './types';
import { buildProfileFromBar, parseStringArray, dateKeyFromUtcIso } from './types';
import type { BarProfileFormState } from './types';

const CALENDAR_RANGE_DAYS = 14;
const LEAGUES: LeagueKey[] = ALL_LEAGUE_KEYS;

function createCalendarRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString();
  const toDate = new Date(now.getTime() + CALENDAR_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return { from, to: toDate.toISOString() };
}

export function useBarOwnerData() {
  const { showToast } = useToast();
	  const { user, me, loading } = useRequireAdminRole(['bar_owner']);
  const [bar, setBar] = useState<BarDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [isLoadingBar, setIsLoadingBar] = useState(false);
  const [barLoadError, setBarLoadError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [profile, setProfile] = useState<BarProfileFormState | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [messages, setMessages] = useState<BarMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const graceEndsMs = tsToMs(bar?.stripe?.gracePeriodEndsAt);
  const paymentFailed = bar?.billingStatus === 'payment_failed';
  const graceDaysRemaining = useMemo(() => {
    if (!paymentFailed || typeof graceEndsMs !== 'number') return null;
    const d = daysRemaining(graceEndsMs);
    return d > 0 ? d : null;
  }, [paymentFailed, graceEndsMs]);
  const graceActive = paymentFailed && typeof graceDaysRemaining === 'number';
  const graceExpired = paymentFailed && !graceActive;
  const canceled = bar?.billingStatus === 'canceled';
  const stripeCustomerId = bar?.stripe?.customerId;
  const hasStripeCustomerId =
    typeof stripeCustomerId === 'string' && stripeCustomerId.trim().length > 0;
  const visibilityBlockedReason = canceled
    ? 'Abonnementet er kansellert. Baren kan ikke settes synlig.'
    : graceExpired
      ? 'Betalingen har feilet og fristen er utløpt. Oppdater betalingskort før baren kan bli synlig.'
      : null;

  const fixtureProvider = useMemo(() => getFixtureProvider(), []);
  const calendarRange = useMemo(() => createCalendarRange(), []);

  // Load bar data
  useEffect(() => {
    const run = async () => {
      if (!user || !me || me.role !== 'bar_owner' || !me.barId) return;
      setIsLoadingBar(true);
	      setBarLoadError(null);
      setBusy(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/bars/${me.barId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
	        const raw: unknown = await res.json().catch(() => ({}));
	        const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
	        if (!res.ok) {
	          const apiError = typeof data?.error === 'string' ? data.error : '';
	          if (res.status === 404) {
	            throw new Error('Baren knyttet til kontoen finnes ikke lenger. Kontakt administrator.');
	          }
	          throw new Error(apiError || `Failed to load bar (${res.status})`);
	        }
	        const barData = data as BarDoc;
	        setBar(barData);
	        setProfile(buildProfileFromBar(barData));
	        if (barData.location && typeof barData.location.lat === 'number' && typeof barData.location.lng === 'number') {
	          setLocation({ lat: barData.location.lat, lng: barData.location.lng });
        } else {
          setLocation(null);
        }
      } catch (e) {
	        const message = e instanceof Error ? e.message : 'Ukjent feil';
	        setBar(null);
	        setProfile(null);
	        setLocation(null);
	        setBarLoadError(message);
	        showToast({ title: 'Feil', description: message, variant: 'error' });
      } finally {
	        setIsLoadingBar(false);
        setBusy(false);
      }
    };
    void run();
  }, [user, me, showToast]);

  // Load fixtures
  useEffect(() => {
    let cancelled = false;
    async function loadFixtures() {
      setIsLoadingFixtures(true);
      setFixturesError(null);
      try {
        const results = await Promise.allSettled(
          LEAGUES.map((league) => fixtureProvider.getUpcomingFixtures(league, calendarRange.from, calendarRange.to)),
        );
        if (cancelled) return;
        const all: Fixture[] = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled') all.push(...r.value);
          else console.error('[BarOwnerDashboard] Fixture fetch failed:', r.reason);
        });
        const deduped = new Map<string, Fixture>();
        all.forEach((f) => deduped.set(f.id, f));
        setFixtures(
          Array.from(deduped.values()).sort(
            (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
          ),
        );
      } catch (e) {
        if (cancelled) return;
        setFixturesError('Kunne ikke laste kamper fra API.');
        console.error(e);
      } finally {
        if (!cancelled) setIsLoadingFixtures(false);
      }
    }
    void loadFixtures();
    return () => { cancelled = true; };
  }, [fixtureProvider, calendarRange.from, calendarRange.to]);

  const activeSelectedFixtureIds = useMemo(() => {
    const selected = new Set(parseStringArray(bar?.selectedFixtureIds));
    const cancelledIds = parseStringArray(bar?.cancelledFixtureIds);
    for (const id of cancelledIds) selected.delete(id);
    return selected;
  }, [bar?.selectedFixtureIds, bar?.cancelledFixtureIds]);

  const selectedFixturesByDateKey = useMemo(() => {
    const map = new Map<string, Fixture[]>();
    if (activeSelectedFixtureIds.size === 0 || fixtures.length === 0) return map;
    for (const f of fixtures) {
      if (!activeSelectedFixtureIds.has(f.id)) continue;
      const key = dateKeyFromUtcIso(f.kickoffUtc);
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    map.forEach((list) => list.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()));
    return map;
  }, [fixtures, activeSelectedFixtureIds]);

  const calendarDays = useMemo(() => {
    const fromDate = new Date(calendarRange.from);
    const toDate = new Date(calendarRange.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];
    const days: { key: string; date: Date }[] = [];
    const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    while (current <= toDate && days.length < 62) {
      const date = new Date(current);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      days.push({ key: `${y}-${m}-${d}`, date });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [calendarRange.from, calendarRange.to]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const matchesNext7DaysCount = useMemo(() => {
    if (fixtures.length === 0 || activeSelectedFixtureIds.size === 0) return 0;
    const now = Date.now();
    const cutoff = now + 7 * 24 * 60 * 60 * 1000;
    let count = 0;
    for (const f of fixtures) {
      if (!activeSelectedFixtureIds.has(f.id)) continue;
      const t = new Date(f.kickoffUtc).getTime();
      if (!Number.isNaN(t) && t >= now && t <= cutoff) count++;
    }
    return count;
  }, [fixtures, activeSelectedFixtureIds]);

  const { unreadMessages, readMessages, unreadMessageCount } = useMemo(() => {
    const unread: BarMessage[] = [];
    const read: BarMessage[] = [];
    for (const m of messages) {
      if (m.readByBar) read.push(m);
      else unread.push(m);
    }
    return { unreadMessages: unread, readMessages: read, unreadMessageCount: unread.length };
  }, [messages]);

  const loadMessages = useCallback(async () => {
    if (!user || !me || me.role !== 'bar_owner' || !me.barId) return;
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${me.barId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Kunne ikke hente meldinger (${res.status})`);
      const raw: unknown = await res.json().catch(() => ({}));
      const data =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? (raw as { messages?: BarMessage[] })
          : null;
      setMessages(Array.isArray(data?.messages) ? data!.messages : []);
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : 'Kunne ikke hente meldinger');
    } finally {
      setMessagesLoading(false);
    }
  }, [user, me]);

  const markMessagesAsRead = useCallback(async (ids: string[]) => {
    if (!user || !me || !me.barId || ids.length === 0) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${me.barId}/messages/mark-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`Kunne ikke oppdatere meldinger (${res.status})`);
      setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, readByBar: true } : m)));
    } catch (e) {
      showToast({ title: 'Feil', description: e instanceof Error ? e.message : 'Kunne ikke markere meldinger som lest.', variant: 'error' });
    }
  }, [user, me, showToast]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  const handleToggleMessagesOpen = () => {
    if (!messagesOpen) {
      const unreadIds = unreadMessages.map((m) => m.id);
      if (unreadIds.length > 0) void markMessagesAsRead(unreadIds);
    }
    setMessagesOpen((prev) => !prev);
  };

  const toggleVisible = async () => {
    if (!user || !me?.barId || !bar) return;
    const next = !bar.isVisible;
    if (next && visibilityBlockedReason) {
      showToast({ title: 'Kan ikke settes synlig', description: visibilityBlockedReason, variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${me.barId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: next }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Failed to update (${res.status})`);
      }
      setBar({ ...bar, isVisible: next });
      showToast({ title: 'Oppdatert', description: next ? 'Baren er nå synlig i appen.' : 'Baren er nå skjult.', variant: 'success' });
    } catch (e) {
      showToast({ title: 'Feil', description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const updatePaymentCard = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      const errMsg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(errMsg || `Kunne ikke åpne portal (${res.status})`);
      const url = typeof data?.url === 'string' ? data.url : '';
      if (!url) throw new Error('Mangler portal-url');
      window.location.assign(url);
    } catch (e) {
      showToast({ title: 'Feil', description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
      setBusy(false);
    }
  };

  return {
	    loading, isLoadingBar, barLoadError,
    bar, busy, setBusy, location, setLocation, profile, setProfile,
    fixtures, isLoadingFixtures, fixturesError,
    messages, messagesLoading, messagesError, messagesOpen,
    paymentFailed, graceDaysRemaining, graceActive, graceExpired,
    canceled, hasStripeCustomerId, visibilityBlockedReason,
    calendarRange, calendarDays, todayKey,
    activeSelectedFixtureIds, selectedFixturesByDateKey,
    matchesNext7DaysCount,
    unreadMessages, readMessages, unreadMessageCount,
    handleToggleMessagesOpen, toggleVisible, updatePaymentCard,
    user, me, setBar,
    CALENDAR_RANGE_DAYS,
  };
}
