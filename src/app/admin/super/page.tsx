'use client';

import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { useBarManagement } from '@/lib/admin/useBarManagement';
import { useInviteManagement } from '@/lib/admin/useInviteManagement';
import { KpiCards } from '@/components/admin/super/KpiCards';
import { InviteSection } from '@/components/admin/super/InviteSection';
import { BarSection } from '@/components/admin/super/BarSection';

export default function SuperAdminDashboard() {
  const { user, me, loading } = useRequireAdminRole(['superadmin']);
  const isSuperadmin = me?.role === 'superadmin';

  const barMgmt = useBarManagement(user, isSuperadmin);
  const inviteMgmt = useInviteManagement(user, isSuperadmin);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500 dark:text-zinc-400">
        Laster…
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Superadmin</h1>
      <KpiCards bars={barMgmt.bars} invites={inviteMgmt.invites} />
      <InviteSection mgmt={inviteMgmt} />
      <BarSection mgmt={barMgmt} />
    </>
  );
}

