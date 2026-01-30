'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminMe } from '@/lib/admin/useAdminMe';

type BarRow = {
  id: string;
  name?: string;
  email?: string;
  isVisible?: boolean;
  billingEnabled?: boolean;
  billingStatus?: string;
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, me, loading, roleOk } = useAdminMe(['superadmin']);
  const [bars, setBars] = useState<BarRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !roleOk)) {
      router.replace('/admin');
    }
  }, [loading, user, roleOk, router]);

  useEffect(() => {
    const run = async () => {
      if (!user || !me || me.role !== 'superadmin') return;
      setBusy(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/bars', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load bars (${res.status})`);
        const data = (await res.json()) as { bars: BarRow[] };
        setBars(data.bars ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ukjent feil');
      } finally {
        setBusy(false);
      }
    };
    void run();
  }, [user, me]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Superadmin</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Oversikt over barer (alfabetisk).
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
	      {busy ? 'Laster...' : `${bars.length} barer`}
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500 dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Bar</th>
                <th className="px-4 py-3 font-medium">Visible</th>
                <th className="px-4 py-3 font-medium">Billing</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((b) => (
                <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/super/bars/${b.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {b.name ?? b.id}
                    </Link>
                    {b.email && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${b.isVisible ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                      {b.isVisible ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${b.billingEnabled ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                      {b.billingEnabled ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {b.billingStatus ?? 'unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
