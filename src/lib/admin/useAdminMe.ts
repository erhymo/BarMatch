'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { AdminMe, AdminRole } from '@/lib/admin/types';
import { getFirebaseAuthClient } from '@/lib/firebase/client';

async function fetchAdminMe(idToken: string): Promise<AdminMe> {
  const res = await fetch('/api/admin/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load admin profile (${res.status})`);
  }
  return (await res.json()) as AdminMe;
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
