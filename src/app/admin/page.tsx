'use client';

import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import { useAdminMe } from '@/lib/admin/useAdminMe';

type AdminMeResponse =
  | { role: 'superadmin' | 'bar_owner'; barId?: string }
  | { error: string };

async function fetchMe(idToken: string): Promise<AdminMeResponse> {
  const res = await fetch('/api/admin/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const raw: unknown = await res.json().catch(() => ({}));
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;

  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : `Ugyldig innlogging (${res.status})`;
    return { error: msg };
  }

  return data as AdminMeResponse;
}

	export default function AdminLoginPage() {
	  const router = useRouter();
	  const { user, me, loading, error: meError } = useAdminMe();
	  const [identifier, setIdentifier] = useState('');
	  const [password, setPassword] = useState('');
	  const [busy, setBusy] = useState(false);
	  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user && me) {
      router.replace(me.role === 'superadmin' ? '/admin/super' : '/admin/bar');
    }
  }, [loading, user, me, router]);

  const normalizeLogin = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;
    // Allow simple username login for early bootstrap (maps to a deterministic email).
    if (!trimmed.includes('@')) {
      return `${trimmed.toLowerCase()}@where2watch.local`;
    }
    return trimmed.toLowerCase();
  };

	  const handleLogin = async () => {
	    setBusy(true);
	    setLoginError(null);
	    try {
	      let auth;
	      try {
	        auth = getFirebaseAuthClient();
	      } catch (e) {
	        // Typical cause in production: NEXT_PUBLIC_FIREBASE_* is not configured for this environment.
	        console.error('[AdminLoginPage] Failed to initialize Firebase client', e);
	        const rawMessage = e instanceof Error ? e.message : 'Admin-innlogging er ikke riktig konfigurert.';
	        if (rawMessage.includes('Missing Firebase client env vars')) {
	          throw new Error(
	            'Admin er ikke satt opp for dette miljøet (mangler Firebase-konfigurasjon). Kontakt utvikler/administrator.',
	          );
	        }
	        throw new Error(rawMessage);
	      }
	
	      const cred = await signInWithEmailAndPassword(auth, normalizeLogin(identifier), password);
	      const token = await cred.user.getIdToken();
	      const me = await fetchMe(token);
	      if ('error' in me) throw new Error(me.error);
	
	      router.replace(me.role === 'superadmin' ? '/admin/super' : '/admin/bar');
	    } catch (e) {
	      setLoginError(e instanceof Error ? e.message : 'Ukjent feil');
	    } finally {
	      setBusy(false);
	    }
	  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
	        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
	          Logg inn
	        </h1>
	        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
	          Innlogging for bar-eiere og superadmin.
	        </p>
	
	        {loading && (
	          <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
	            Sjekker innlogging...
	          </div>
	        )}
	
	        {!loading && meError && (
	          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
	            {meError.includes('Missing Firebase client env vars')
	              ? 'Admin er ikke satt opp for dette miljøet (mangler Firebase-klientkonfigurasjon). Kontakt utvikler/administrator.'
	              : meError}
	          </div>
	        )}

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
              E-post eller brukernavn
            </span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type="text"
              autoComplete="username"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-50/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Passord</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-50/20"
            />
          </label>

	          {loginError && (
	            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
	              {loginError}
	            </div>
	          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={busy || !identifier || !password}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {busy ? 'Logger inn…' : 'Logg inn'}
          </button>

	          <div className="pt-2 text-center text-sm">
	            <a href="/forgot-password" className="text-zinc-700 underline dark:text-zinc-300">
	              Glemt passord?
	            </a>
	          </div>
        </div>
      </div>
    </div>
  );
}
