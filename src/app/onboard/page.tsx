'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import DraggablePinMap from '@/components/onboard/DraggablePinMap';

type Step = 'account' | 'bar' | 'payment';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function validPassword(pw: string) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

function OnboardInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get('token')?.trim() || '';
  const barIdParam = sp.get('barId')?.trim() || '';
  const stepParam = (sp.get('step')?.trim() || '') as Step;

  const [user, setUser] = useState<User | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [trialDays, setTrialDays] = useState<number>(0);
  const [barId, setBarId] = useState<string>('');

  const [step, setStep] = useState<Step>('account');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [accept, setAccept] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('NO');
  const [pos, setPos] = useState<{ lat: number; lng: number }>({ lat: 59.9139, lng: 10.7522 });

  const mapsKey = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', []);

  useEffect(() => {
    const auth = getFirebaseAuthClient();
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (barIdParam && barIdParam !== barId) {
      setBarId(barIdParam);
    }
  }, [barIdParam, barId]);

  useEffect(() => {
    if (stepParam === 'bar' || stepParam === 'payment') setStep(stepParam);
  }, [stepParam]);

  useEffect(() => {
    const loadInvite = async () => {
      // If we already have a barId (e.g. after a refresh/cancel from Stripe), we don't
      // need to re-validate the invite token (it may already be used).
      if (!token) return;
      if (barIdParam) return;

      setError(null);
      const res = await fetch(`/api/invites/validate?token=${encodeURIComponent(token)}`);
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);

      if (!res.ok || data?.ok !== true) {
        const status = typeof data?.status === 'string' ? ` (${data.status})` : '';
        const msg = typeof data?.error === 'string' ? data.error : '';
        setError(msg || `Ugyldig invitasjon${status}`);
        return;
      }

      const inv = asRecord(data.invite);
      setInviteEmail(typeof inv?.email === 'string' ? inv.email : '');
      setTrialDays(typeof inv?.trialDays === 'number' ? inv.trialDays : Number(inv?.trialDays ?? 0));
      setStep('account');
    };
    void loadInvite();
  }, [token, barIdParam]);

  const authHeader = async () => {
    if (!user) throw new Error('Du må være innlogget');
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  };

  const goToStep = (next: Step, nextBarId?: string) => {
    const qs = new URLSearchParams();
    if (token) qs.set('token', token);
    const id = nextBarId ?? barId;
    if (id) qs.set('barId', id);
    qs.set('step', next);
    router.replace(`/onboard?${qs.toString()}`);
  };

  const completeAccount = async () => {
    if (!token) throw new Error('Mangler token');
    const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
    const res = await fetch('/api/onboard/complete-account', {
      method: 'POST',
      headers,
      body: JSON.stringify({ inviteId: token }),
    });
    const raw: unknown = await res.json().catch(() => ({}));
    const data = asRecord(raw);
    if (!res.ok) {
      const msg = typeof data?.error === 'string' ? data.error : '';
      throw new Error(msg || `Feil (${res.status})`);
    }

    const newBarId = typeof data?.barId === 'string' ? data.barId : '';
    setBarId(newBarId);
    setStep('bar');
    goToStep('bar', newBarId);
  };

  const handleCreateOrLink = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!inviteEmail) throw new Error('Mangler e-post fra invitasjon');
      if (!accept) throw new Error('Du må godta vilkår/personvern');

      if (!user) {
        if (!validPassword(pw)) throw new Error('Passord må være 8+ tegn, 1 stor bokstav og 1 tall');
        if (pw !== pw2) throw new Error('Passordene matcher ikke');
        const cred = await createUserWithEmailAndPassword(getFirebaseAuthClient(), inviteEmail, pw);
        setUser(cred.user);
      }

      await completeAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
    } finally {
      setBusy(false);
    }
  };

  const geocode = async () => {
    setBusy(true);
    setError(null);
    try {
      const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers,
        body: JSON.stringify({ address }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Geocode feilet (${res.status})`);
      }

      if (typeof data?.formattedAddress === 'string' && data.formattedAddress) {
        setAddress(data.formattedAddress);
      }
      if (typeof data?.city === 'string') setCity(data.city);
      if (typeof data?.country === 'string') setCountry(data.country);

      const loc = asRecord(data?.location);
      if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
        setPos({ lat: loc.lat, lng: loc.lng });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
    } finally {
      setBusy(false);
    }
  };

  const saveBar = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!barId) throw new Error('Mangler barId');
      const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
      const res = await fetch(`/api/admin/bars/${barId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name, address, city, country, location: pos }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Lagring feilet (${res.status})`);
      }
      setStep('payment');
      goToStep('payment');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
    } finally {
      setBusy(false);
    }
  };

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
      const res = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ barId }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Stripe feilet (${res.status})`);
      }

      const url = typeof data?.checkoutUrl === 'string' ? data.checkoutUrl : '';
      if (!url) throw new Error('Mangler checkoutUrl');
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Onboarding</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Invitasjon → konto → barinfo → betaling.</p>

      {!token && !barId && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          Åpne onboarding via invitasjonslenken du fikk på e-post.
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

      {step === 'account' && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">1) Opprett konto</h2>
          <div className="mt-3 grid gap-3">
            <input value={inviteEmail} readOnly placeholder="E-post" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            {!user && (
              <>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Passord" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
                <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Gjenta passord" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              Jeg godtar vilkår og personvern
            </label>
            <button disabled={busy} onClick={handleCreateOrLink} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
              {user ? 'Koble invitasjon' : 'Opprett konto'}
            </button>
          </div>
        </div>
      )}

      {step === 'bar' && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">2) Barinfo</h2>
          <div className="mt-3 grid gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn på bar" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            <div className="flex gap-2">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="By" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Land" className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
            <button disabled={busy || !address} onClick={geocode} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              Geokode adresse
            </button>
            <DraggablePinMap apiKey={mapsKey} center={pos} marker={pos} onChange={setPos} />
            <button disabled={busy || !name || !address} onClick={saveBar} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
              Lagre og gå videre
            </button>
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">3) Betaling</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Kort registreres nå. Første belastning skjer ved slutten av prøvetiden ({trialDays} dager).
          </p>
          <button disabled={busy || !barId} onClick={startCheckout} className="mt-4 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Gå til Stripe Checkout
          </button>
        </div>
      )}
    </div>
  );
}

export default function OnboardPage() {
  // Next.js requires `useSearchParams()` to be used under a Suspense boundary.
  // We keep the onboarding page as a client component, but move the hook usage
  // into a child component that is wrapped in <Suspense>.
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-zinc-700 dark:text-zinc-200">
          Laster...
        </div>
      }
    >
      <OnboardInner />
    </Suspense>
  );
}

