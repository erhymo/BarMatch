'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import DraggablePinMap from '@/components/onboard/DraggablePinMap';
import { asRecord } from '@/lib/utils/unknown';

type Step = 'account' | 'bar' | 'payment';
type AccountMode = 'signup' | 'signin';
type AddressCandidate = {
  formattedAddress: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
};

function readAccountMode(value: string | null | undefined): AccountMode | null {
  return value === 'signin' || value === 'signup' ? value : null;
}

function validPassword(pw: string) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

function readAddressCandidates(value: unknown): AddressCandidate[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    const rec = asRecord(entry);
    const loc = asRecord(rec?.location);
    const formattedAddress = typeof rec?.formattedAddress === 'string' ? rec.formattedAddress : '';
    const city = typeof rec?.city === 'string' ? rec.city : '';
    const country = typeof rec?.country === 'string' ? rec.country : '';
    const lat = typeof loc?.lat === 'number' ? loc.lat : Number(loc?.lat);
    const lng = typeof loc?.lng === 'number' ? loc.lng : Number(loc?.lng);

    if (!formattedAddress || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{ formattedAddress, city, country, location: { lat, lng } }];
  });
}

function getCandidateTitle(candidate: AddressCandidate): string {
  const firstPart = candidate.formattedAddress.split(',')[0]?.trim() || candidate.formattedAddress;
  if (candidate.city && !firstPart.toLowerCase().includes(candidate.city.toLowerCase())) {
    return `${firstPart}, ${candidate.city}`;
  }
  return firstPart;
}

function readFirebaseAuthCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const rec = error as { code?: unknown; message?: unknown };
    if (typeof rec.code === 'string' && rec.code) return rec.code;
    if (typeof rec.message === 'string') {
      const match = rec.message.match(/auth\/[a-z-]+/i);
      if (match) return match[0].toLowerCase();
    }
  }
  if (error instanceof Error) {
    const match = error.message.match(/auth\/[a-z-]+/i);
    if (match) return match[0].toLowerCase();
  }
  return '';
}

function mapOnboardingAuthError(error: unknown, mode: AccountMode): string {
  const code = readFirebaseAuthCode(error);
  if (code === 'auth/email-already-in-use') {
    return 'Det finnes allerede en konto på denne e-posten. Velg «Jeg har allerede konto» og logg inn i stedet.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials' || code === 'auth/wrong-password') {
    return 'Feil passord eller ugyldig innlogging. Prøv igjen.';
  }
  if (code === 'auth/user-not-found' && mode === 'signin') {
    return 'Fant ingen eksisterende konto på denne e-posten. Velg «Opprett ny konto» i stedet.';
  }
  if (code === 'auth/weak-password') {
    return 'Passordet er for svakt. Bruk minst 8 tegn, én stor bokstav og ett tall.';
  }
  if (code === 'auth/too-many-requests') {
    return 'For mange forsøk. Vent litt og prøv igjen.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Innlogging er ikke riktig satt opp for dette domenet ennå. Kontakt oss hvis problemet fortsetter.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Nettverksfeil. Sjekk forbindelsen og prøv igjen.';
  }
  if (error instanceof Error && error.message.includes('Missing Firebase client env vars')) {
    return 'Innlogging er ikke satt opp riktig for dette miljøet ennå. Kontakt oss hvis problemet fortsetter.';
  }
  return error instanceof Error ? error.message : 'Ukjent feil';
}

function mapInviteValidationError(status: string | null, fallbackMessage: string): string {
  if (status === 'not_found') {
    return 'Vi fant ikke invitasjonen. Be oss sende en ny invitasjonslenke.';
  }
  if (status === 'expired') {
    return 'Invitasjonslenken har utløpt. Be oss sende en ny lenke, så hjelper vi deg videre.';
  }
  if (status === 'used') {
    return 'Denne invitasjonslenken er allerede brukt. Logg inn med kontoen din hvis du vil fortsette oppsettet.';
  }
  if (status === 'cancelled') {
    return 'Denne invitasjonen er ikke lenger aktiv. Be oss sende en ny lenke.';
  }
  return fallbackMessage || 'Ugyldig invitasjon';
}

function mapCompleteAccountError(status: string | null, fallbackMessage: string): string {
  if (status === 'email_mismatch') {
    return 'Invitasjonen hører til en annen e-postadresse. Logg inn eller opprett konto med den inviterte e-posten.';
  }
  if (status === 'missing_email') {
    return 'Vi fant ingen e-post på kontoen din. Prøv å logge inn på nytt.';
  }
  return mapInviteValidationError(status, fallbackMessage);
}

function OnboardInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get('token')?.trim() || '';
  const barIdParam = sp.get('barId')?.trim() || '';
  const stepParam = (sp.get('step')?.trim() || '') as Step;
  const modeParam = readAccountMode(sp.get('mode'));

  const [user, setUser] = useState<User | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [trialDays, setTrialDays] = useState<number>(0);
  const [barId, setBarId] = useState<string>('');

  const [step, setStep] = useState<Step>('account');
  const [accountMode, setAccountMode] = useState<AccountMode>(() => modeParam ?? 'signup');
  const [busy, setBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [accept, setAccept] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('NO');
  const [pos, setPos] = useState<{ lat: number; lng: number }>({ lat: 59.9139, lng: 10.7522 });
  const [manualLocationOverride, setManualLocationOverride] = useState(false);
  const [addressCandidates, setAddressCandidates] = useState<AddressCandidate[]>([]);

  const mapsKey = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', []);
  const forgotPasswordHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (inviteEmail) qs.set('email', inviteEmail);
    if (token || barIdParam) {
      const returnQs = new URLSearchParams();
      if (token) returnQs.set('token', token);
      if (barIdParam) returnQs.set('barId', barIdParam);
      returnQs.set('step', 'account');
      returnQs.set('mode', 'signin');
      qs.set('returnTo', `/onboard?${returnQs.toString()}`);
    }
    const query = qs.toString();
    return query ? `/forgot-password?${query}` : '/forgot-password';
  }, [barIdParam, inviteEmail, token]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const auth = getFirebaseAuthClient();
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      });
    } catch (e) {
      setError(mapOnboardingAuthError(e, 'signup'));
      setAuthReady(true);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (barIdParam && barIdParam !== barId) {
      setBarId(barIdParam);
    }
  }, [barIdParam, barId]);

  useEffect(() => {
    if (stepParam === 'account' || stepParam === 'bar' || stepParam === 'payment') setStep(stepParam);
  }, [stepParam]);

  useEffect(() => {
    if (!user && modeParam && modeParam !== accountMode) {
      setAccountMode(modeParam);
      setPw('');
      setPw2('');
      setError(null);
    }
  }, [accountMode, modeParam, user]);

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
        const status = typeof data?.status === 'string' ? data.status : null;
        const msg = typeof data?.error === 'string' ? data.error : '';
        setError(mapInviteValidationError(status, msg));
        return;
      }

      const inv = asRecord(data.invite);
      setInviteEmail(typeof inv?.email === 'string' ? inv.email : '');
      setTrialDays(typeof inv?.trialDays === 'number' ? inv.trialDays : Number(inv?.trialDays ?? 0));
      setStep('account');
    };
    void loadInvite();
  }, [token, barIdParam]);

  const authHeader = async (authUser?: User | null) => {
    const activeUser = authUser ?? user;
    if (!activeUser) throw new Error('Du må være innlogget');
    return { Authorization: `Bearer ${await activeUser.getIdToken()}` };
  };

  const handleAddressChange = (value: string) => {
    setAddressCandidates([]);
    setManualLocationOverride(false);
    setAddress(value);
  };

  const changeAccountMode = (nextMode: AccountMode) => {
    setAccountMode(nextMode);
    setPw('');
    setPw2('');
    setError(null);
  };

  const handleSwitchAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut(getFirebaseAuthClient());
      setUser(null);
      changeAccountMode('signin');
    } catch (e) {
      setError(mapOnboardingAuthError(e, 'signin'));
    } finally {
      setBusy(false);
    }
  };

  const handleCityChange = (value: string) => {
    setAddressCandidates([]);
    setManualLocationOverride(false);
    setCity(value);
  };

  const handleCountryChange = (value: string) => {
    setAddressCandidates([]);
    setManualLocationOverride(false);
    setCountry(value);
  };

  const handlePinChange = (nextPos: { lat: number; lng: number }) => {
    setAddressCandidates([]);
    setManualLocationOverride(true);
    setPos(nextPos);
  };

  const applyAddressCandidate = (candidate: AddressCandidate) => {
    setAddress(candidate.formattedAddress);
    setCity(candidate.city);
    setCountry(candidate.country || 'NO');
    setPos(candidate.location);
    setManualLocationOverride(false);
    setAddressCandidates([]);
    setError(null);
  };

  const goToStep = (next: Step, nextBarId?: string) => {
    const qs = new URLSearchParams();
    if (token) qs.set('token', token);
    const id = nextBarId ?? barId;
    if (id) qs.set('barId', id);
    qs.set('step', next);
    router.replace(`/onboard?${qs.toString()}`);
  };

  const completeAccount = async (authUser?: User | null) => {
    if (!token) throw new Error('Mangler token');
    const headers = { ...(await authHeader(authUser)), 'Content-Type': 'application/json' };
    const res = await fetch('/api/onboard/complete-account', {
      method: 'POST',
      headers,
      body: JSON.stringify({ inviteId: token }),
    });
    const raw: unknown = await res.json().catch(() => ({}));
    const data = asRecord(raw);
    if (!res.ok) {
      const status = typeof data?.status === 'string' ? data.status : null;
      const msg = typeof data?.error === 'string' ? data.error : '';
      throw new Error(mapCompleteAccountError(status, msg || `Feil (${res.status})`));
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
      if (!authReady) throw new Error('Sjekker innlogging. Prøv igjen om et øyeblikk.');
      if (!accept) throw new Error('Du må godta vilkår/personvern');

      let activeUser = user;

      if (activeUser && activeUser.email?.toLowerCase() !== inviteEmail.toLowerCase()) {
        await signOut(getFirebaseAuthClient());
        setUser(null);
        throw new Error('Du er innlogget med en annen e-post enn invitasjonen. Logg inn eller opprett konto med invitert e-post.');
      }

      if (!activeUser) {
        const auth = getFirebaseAuthClient();
        let cred;

        if (accountMode === 'signin') {
          if (!pw) throw new Error('Skriv inn passordet ditt for å logge inn.');
          cred = await signInWithEmailAndPassword(auth, inviteEmail, pw);
        } else {
          if (!validPassword(pw)) throw new Error('Passord må være 8+ tegn, 1 stor bokstav og 1 tall');
          if (pw !== pw2) throw new Error('Passordene matcher ikke');
          cred = await createUserWithEmailAndPassword(auth, inviteEmail, pw);
          // Send verification email right away (visibility is blocked until verified).
          try {
            await sendEmailVerification(cred.user);
          } catch {
            // best effort
          }
        }

        setUser(cred.user);
        activeUser = cred.user;
      }

      await completeAccount(activeUser);
    } catch (e) {
      const code = readFirebaseAuthCode(e);
      if (code === 'auth/email-already-in-use') {
        setAccountMode('signin');
      }
      if (code === 'auth/user-not-found' && accountMode === 'signin') {
        setAccountMode('signup');
      }
      setError(mapOnboardingAuthError(e, accountMode));
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
        body: JSON.stringify({ address, city, country }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = asRecord(raw);
      const candidates = readAddressCandidates(data?.candidates);

      if (!res.ok) {
        if (res.status === 409 && candidates.length > 0) {
          setAddressCandidates(candidates);
          return;
        }
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Geocode feilet (${res.status})`);
      }

      setAddressCandidates([]);
      if (typeof data?.formattedAddress === 'string' && data.formattedAddress) {
        setAddress(data.formattedAddress);
      }
      if (typeof data?.city === 'string') setCity(data.city);
      if (typeof data?.country === 'string') setCountry(data.country);

      const loc = asRecord(data?.location);
      if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
        setPos({ lat: loc.lat, lng: loc.lng });
      }
      setManualLocationOverride(false);
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
        body: JSON.stringify({ name, address, city, country, location: pos, manualLocationOverride }),
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

	  const continueWithoutPayment = () => {
	    if (!barId) return;
	    router.push('/admin/bar');
	  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Kom i gang med baren din</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Vi leder deg trygt gjennom konto, barinfo og betaling. Dette tar bare noen minutter.</p>

      {!token && !barId && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          Åpne onboarding via invitasjonslenken du fikk på e-post.
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}

      {step === 'account' && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">1) Konto</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Bruk e-posten i invitasjonen nedenfor. Har du allerede konto, logger du bare inn. Er du ny, oppretter du konto og fortsetter.
          </p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Invitert e-post</span>
              <input value={inviteEmail} readOnly placeholder="E-post" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            </label>
            {!authReady && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Sjekker innlogging…
              </div>
            )}
            {!user && authReady && (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => changeAccountMode('signup')}
                    className={`rounded-md px-3 py-2 text-sm ${accountMode === 'signup' ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' : 'text-zinc-700 dark:text-zinc-300'}`}
                  >
                    Jeg er ny her
                  </button>
                  <button
                    type="button"
                    onClick={() => changeAccountMode('signin')}
                    className={`rounded-md px-3 py-2 text-sm ${accountMode === 'signin' ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' : 'text-zinc-700 dark:text-zinc-300'}`}
                  >
                    Jeg har allerede konto
                  </button>
                </div>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={accountMode === 'signin' ? 'Passord' : 'Lag passord'} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
                {accountMode === 'signup' && (
                  <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Gjenta passord" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
                )}
                {accountMode === 'signin' && (
                  <a href={forgotPasswordHref} className="text-sm text-zinc-700 underline dark:text-zinc-300">
                    Glemt passord?
                  </a>
                )}
              </>
            )}
            {user && authReady && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                <span>Innlogget som {user.email ?? 'ukjent e-post'}.</span>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={busy}
                  className="shrink-0 rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-900 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-100"
                >
                  Bytt konto
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              Jeg godtar vilkår og personvern
            </label>
            <button disabled={busy || !authReady || !inviteEmail} onClick={handleCreateOrLink} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
              {user ? 'Fortsett med denne kontoen' : accountMode === 'signin' ? 'Logg inn og fortsett' : 'Opprett konto og fortsett'}
            </button>
          </div>
        </div>
      )}

      {step === 'bar' && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">2) Barinfo</h2>
          <div className="mt-3 grid gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn på bar" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            <input value={address} onChange={(e) => handleAddressChange(e.target.value)} placeholder="Adresse" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            <div className="flex gap-2">
              <input value={city} onChange={(e) => handleCityChange(e.target.value)} placeholder="By" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
              <input value={country} onChange={(e) => handleCountryChange(e.target.value)} placeholder="Land" className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
            <button disabled={busy || !address} onClick={geocode} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              Geokode adresse
            </button>
            {addressCandidates.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Vi fant flere mulige adresser. Velg riktig treff:</p>
                <div className="mt-3 space-y-2">
                  {addressCandidates.map((candidate) => (
                    <button
                      key={`${candidate.formattedAddress}-${candidate.location.lat}-${candidate.location.lng}`}
                      type="button"
                      onClick={() => applyAddressCandidate(candidate)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 transition hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-amber-950/40"
                    >
                      <div className="font-medium">{getCandidateTitle(candidate)}</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{candidate.formattedAddress}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <DraggablePinMap apiKey={mapsKey} center={pos} marker={pos} onChange={handlePinChange} />
            <button disabled={busy || !name || !address || addressCandidates.length > 0} onClick={saveBar} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
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
	          <button
	            disabled={busy || !barId}
	            onClick={startCheckout}
	            className="mt-4 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
	          >
	            Gå til Stripe Checkout
	          </button>
	          <button
	            type="button"
	            disabled={busy || !barId}
	            onClick={continueWithoutPayment}
	            className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50"
	          >
	            Fortsett uten betaling
	          </button>
	          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
	            Du kan sette opp betaling senere fra barpanelet under «Betaling».
	          </p>
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

