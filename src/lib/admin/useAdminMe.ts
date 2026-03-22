'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { AdminMe, AdminRole } from '@/lib/admin/types';
import { getFirebaseAuthClient } from '@/lib/firebase/client';
import { asRecord } from '@/lib/utils/unknown';

function readAdminMe(value: unknown): AdminMe {
  const data = asRecord(value);
  const uid = typeof data?.uid === 'string' ? data.uid : '';
  const email = typeof data?.email === 'string' || data?.email === null ? data.email : null;
  const role = data?.role;
  const barId = typeof data?.barId === 'string' ? data.barId : undefined;

  if (!uid || (role !== 'superadmin' && role !== 'bar_owner')) {
    throw new Error('Ugyldig adminprofil fra serveren.');
  }

  return { uid, email, role, barId };
}

async function fetchAdminMe(idToken: string): Promise<AdminMe> {
  const res = await fetch('/api/admin/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const raw: unknown = await res.json().catch(() => ({}));
  const data = asRecord(raw);

  if (!res.ok) {
	    const msg = typeof data?.error === 'string' ? data.error : '';
	    if (res.status === 401) {
	      throw new Error(msg || 'Adminøkten er ikke gyldig lenger. Logg inn på nytt.');
	    }
	    if (res.status === 403) {
	      throw new Error(msg || 'Denne brukeren har ikke tilgang til adminpanelet.');
	    }
	    throw new Error(msg || `Failed to load admin profile (${res.status})`);
  }

  return readAdminMe(data);
}

export function useAdminMe(requiredRoles?: AdminRole[]) {
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
	    let unsub: (() => void) | undefined;
	    try {
	      const auth = getFirebaseAuthClient();
	      unsub = onAuthStateChanged(auth, async (u) => {
	        setUser(u);
	        setError(null);
	
	        if (!u) {
	          setMe(null);
	          setLoading(false);
	          return;
	        }
	
	        try {
	          setLoading(true);
	          const token = await u.getIdToken();
	          const loaded = await fetchAdminMe(token);
	          setMe(loaded);
	        } catch (e) {
	          setMe(null);
	          setError(e instanceof Error ? e.message : 'Unknown error');
	        } finally {
	          setLoading(false);
	        }
	      });
	    } catch (e) {
	      // Gracefully handle missing Firebase client env vars on client (e.g. Vercel env not configured).
	      console.error('[useAdminMe] Failed to initialize Firebase client', e);
	      setUser(null);
	      setMe(null);
	      setError(e instanceof Error ? e.message : 'Konfigurasjonsfeil (Firebase klient).');
	      setLoading(false);
	    }
	
	    return () => {
	      if (unsub) unsub();
	    };
	  }, []);

  const roleOk = useMemo(() => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return me ? requiredRoles.includes(me.role) : false;
  }, [me, requiredRoles]);

  return { user, me, loading, error, roleOk };
}
