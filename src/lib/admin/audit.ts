import { FieldValue } from 'firebase-admin/firestore';

import { getFirebaseAdminDb } from '@/lib/firebase/admin';

export async function logAdminAction(params: {
  adminUid: string;
  barId?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
}) {
  const db = getFirebaseAdminDb();
  await db.collection('adminActions').add({
    adminUid: params.adminUid,
    barId: params.barId ?? null,
    action: params.action,
    details: params.details ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
