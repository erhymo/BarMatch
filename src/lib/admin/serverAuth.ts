import type { AdminMe, AdminRole } from '@/lib/admin/types';
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase/admin';

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer (.+)$/i);
  return match?.[1] ?? null;
}

export async function requireFirebaseUser(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error('Missing Authorization header');
  }

  const auth = getFirebaseAdminAuth();
  return auth.verifyIdToken(token);
}

export async function getAdminMeForUid(uid: string): Promise<AdminMe | null> {
  const db = getFirebaseAdminDb();

  const adminSnap = await db.collection('admins').doc(uid).get();
  if (adminSnap.exists && adminSnap.data()?.enabled === true) {
    return { uid, email: null, role: 'superadmin' };
  }

  const barUserSnap = await db.collection('barUsers').doc(uid).get();
  if (barUserSnap.exists) {
    const data = barUserSnap.data() as { barId?: string; email?: string } | undefined;
    if (data?.barId) {
      return { uid, email: data.email ?? null, role: 'bar_owner', barId: data.barId };
    }
  }

  return null;
}

export async function requireRole(
  request: Request,
  allowed: AdminRole[],
): Promise<{ uid: string; me: AdminMe }> {
  const decoded = await requireFirebaseUser(request);
  const me = await getAdminMeForUid(decoded.uid);
  if (!me || !allowed.includes(me.role)) {
    throw new Error('Forbidden');
  }
  return { uid: decoded.uid, me: { ...me, email: decoded.email ?? me.email ?? null } };
}
