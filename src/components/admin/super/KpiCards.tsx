'use client';

import { useMemo } from 'react';
import type { BarRow } from '@/lib/admin/useBarManagement';
import { isBillingOk, isBillingFailed, isInGrace } from '@/lib/admin/useBarManagement';
import type { InviteRow } from '@/lib/admin/useInviteManagement';

interface KpiCardsProps {
  bars: BarRow[];
  invites: InviteRow[];
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}

export function KpiCards({ bars, invites }: KpiCardsProps) {
  const kpi = useMemo(() => {
    let active = 0;
    let failed = 0;
    let grace = 0;
    for (const bar of bars) {
      if (isBillingOk(bar)) active += 1;
      if (isBillingFailed(bar)) failed += 1;
      if (isInGrace(bar)) grace += 1;
    }
    const pendingInvites = invites.filter((inv) => inv.status === 'pending').length;
    return { active, failed, grace, pendingInvites };
  }, [bars, invites]);

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Aktive barer" value={kpi.active} />
      <KpiCard label="Betalingsproblem" value={kpi.failed} />
      <KpiCard label="I grace-periode" value={kpi.grace} />
      <KpiCard label="Ventende invitasjoner" value={kpi.pendingInvites} />
    </div>
  );
}

