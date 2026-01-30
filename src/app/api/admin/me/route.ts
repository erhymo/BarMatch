import { NextResponse } from 'next/server';
import { requireFirebaseUser, getAdminMeForUid } from '@/lib/admin/serverAuth';

export async function GET(request: Request) {
  try {
    const decoded = await requireFirebaseUser(request);
    const me = await getAdminMeForUid(decoded.uid);
    if (!me) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      ...me,
      email: decoded.email ?? me.email ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
