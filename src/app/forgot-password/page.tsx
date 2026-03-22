'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';

import { getFirebaseAuthClient } from '@/lib/firebase/client';

function normalizeLogin(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.includes('@')) return `${trimmed.toLowerCase()}@where2watch.local`;
  return trimmed.toLowerCase();
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

function readSafeReturnTo(value: string | null): string {
  const trimmed = value?.trim() || '';
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/admin';
  return trimmed;
}

function mapForgotPasswordError(error: unknown): string {
  const code = readFirebaseAuthCode(error);
  if (code === 'auth/invalid-email') {
    return 'Skriv inn en gyldig e-postadresse.';
  }
  if (code === 'auth/too-many-requests') {
    return 'For mange forsøk. Vent litt og prøv igjen.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Nettverksfeil. Sjekk forbindelsen og prøv igjen.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Dette domenet er ikke godkjent i Firebase Auth ennå. Kontakt oss hvis problemet fortsetter.';
  }
  if (error instanceof Error && error.message.includes('Missing Firebase client env vars')) {
    return 'Passord-reset er ikke satt opp riktig for dette miljøet ennå. Kontakt oss hvis problemet fortsetter.';
  }
  return error instanceof Error ? error.message : 'Ukjent feil';
}

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const returnTo = readSafeReturnTo(searchParams.get('returnTo'));
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const invitedEmail = normalizeLogin(searchParams.get('email')?.trim() || '');
    if (invitedEmail) {
      setIdentifier((current) => current || invitedEmail);
    }
  }, [searchParams]);

  const handleSend = async () => {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const email = normalizeLogin(identifier);
      if (!email || !email.includes('@')) throw new Error('Skriv inn e-post eller brukernavn');
      await sendPasswordResetEmail(getFirebaseAuthClient(), email);
      // Do not leak whether user exists.
      setSent(true);
    } catch (e) {
      const code = readFirebaseAuthCode(e);
      if (code === 'auth/user-not-found') {
        setSent(true);
        return;
      }
      setError(mapForgotPasswordError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Glemt passord</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Skriv inn e-post (eller brukernavn), så sender vi en lenke for å sette nytt passord.
        </p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">E-post eller brukernavn</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type="text"
              autoComplete="username"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-50/20"
            />
          </label>

          {sent && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
              Hvis kontoen finnes, er e-post med reset-lenke sendt.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={busy || !identifier}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {busy ? 'Sender…' : 'Send reset-lenke'}
          </button>

          <div className="pt-2 text-center text-sm">
            <a href={returnTo} className="text-zinc-700 underline dark:text-zinc-300">
              Tilbake til innlogging
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-700 dark:text-zinc-200">Laster...</div>}>
      <ForgotPasswordInner />
    </Suspense>
  );
}
