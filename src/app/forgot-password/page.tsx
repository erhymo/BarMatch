'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';

import { getFirebaseAuthClient } from '@/lib/firebase/client';

function normalizeLogin(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.includes('@')) return `${trimmed.toLowerCase()}@where2watch.local`;
  return trimmed.toLowerCase();
}

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
      const msg = e instanceof Error ? e.message : 'Ukjent feil';
      // Common Firebase Auth production issue: unauthorized domain.
      if (msg.includes('auth/unauthorized-domain')) {
        setError(
          'Dette domenet er ikke godkjent i Firebase Auth (authorized domains). Legg til domenet i Firebase Console og prøv igjen.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Glemt passord</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Skriv inn e-post (eller brukernavn) – så sender vi en lenke for å sette nytt passord.
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
            <a href="/admin" className="text-zinc-700 underline dark:text-zinc-300">
              Tilbake til innlogging
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
