'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminRole } from '@/lib/admin/types';
import { useAdminMe } from '@/lib/admin/useAdminMe';

/**
 * Centralized role guard for admin pages.
 *
 * We keep the existing auth/me fetching in `useAdminMe`, but ensure the redirect
 * behavior is consistent and implemented in one place.
 */
export function useRequireAdminRole(
  requiredRoles?: AdminRole[],
  options?: { redirectTo?: string },
) {
  const router = useRouter();
  const redirectTo = options?.redirectTo ?? '/admin';

  const state = useAdminMe(requiredRoles);

  // `requiredRoles` is often passed inline (e.g. ['superadmin']), so stabilize dependencies.
  const rolesKey = useMemo(() => (requiredRoles ?? []).slice().sort().join('|'), [requiredRoles]);

  useEffect(() => {
    if (state.loading) return;

    if (!state.user || !state.roleOk) {
      // Avoid "silent" failures in dev.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useRequireAdminRole] redirect', {
          redirectTo,
          rolesKey,
          hasUser: Boolean(state.user),
          roleOk: state.roleOk,
          error: state.error,
        });
      }
      router.replace(redirectTo);
    }
  }, [state.loading, state.user, state.roleOk, state.error, rolesKey, redirectTo, router]);

  return state;
}

