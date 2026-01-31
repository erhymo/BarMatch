import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';
import { getFirebaseAdminAuth } from '@/lib/firebase/admin';
import { logAdminAction } from '@/lib/admin/audit';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toMillisMaybe(value: unknown): number | null {
  if (!value) return null;

  const rec = asRecord(value);
  const fn = rec?.toMillis;
  if (typeof fn === 'function') {
    try {
      const ms = (fn as (this: unknown) => number).call(value);
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    const { me, uid } = await requireRole(request, ['superadmin', 'bar_owner']);
    const { barId } = await params;

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getFirebaseAdminDb();
    const ref = db.collection('bars').doc(barId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Keep emailVerified in sync for bar owners (source of truth = Firebase Auth).
    if (me.role === 'bar_owner') {
      try {
        const auth = getFirebaseAdminAuth();
        const user = await auth.getUser(uid);
        const verified = user.emailVerified;
        const existing = doc.data() as Record<string, unknown>;
        if (Boolean(existing?.emailVerified) !== verified) {
          await ref.set(
            { emailVerified: verified, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }
      } catch (err) {
        console.error('Failed syncing emailVerified for bar:', barId, err);
      }
    }

    return NextResponse.json({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ barId: string }> },
) {
  try {
    const { me, uid } = await requireRole(request, ['superadmin', 'bar_owner']);
    const { barId } = await params;

    if (me.role === 'bar_owner' && me.barId !== barId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const db = getFirebaseAdminDb();
    const barRef = db.collection('bars').doc(barId);
    const barSnap = await barRef.get();
    if (!barSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const barData = (barSnap.data() ?? {}) as Record<string, unknown>;

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if ('isVisible' in body) {
      if (typeof body.isVisible !== 'boolean') {
        return NextResponse.json({ error: 'Invalid isVisible' }, { status: 400 });
      }

      const nextVisible = body.isVisible;
      const billingStatus = typeof barData.billingStatus === 'string' ? barData.billingStatus : 'unknown';
      const graceEndsMs = toMillisMaybe((barData.stripe as Record<string, unknown> | undefined)?.gracePeriodEndsAt);

      // Bar-owner rules (superadmin can override from superadmin page)
      if (me.role === 'bar_owner' && nextVisible) {
        // Email verification gate
        const auth = getFirebaseAdminAuth();
        const user = await auth.getUser(uid);
        update.emailVerified = user.emailVerified;
        if (!user.emailVerified) {
          return NextResponse.json(
            { error: 'Du må verifisere e-post før baren kan settes synlig.' },
            { status: 400 },
          );
        }

        // Billing gate
        if (billingStatus === 'canceled') {
          return NextResponse.json(
            { error: 'Abonnementet er kansellert. Baren kan ikke settes synlig.' },
            { status: 400 },
          );
        }
        if (billingStatus === 'payment_failed') {
          const graceActive = typeof graceEndsMs === 'number' && graceEndsMs > Date.now();
          if (!graceActive) {
            return NextResponse.json(
              {
                error:
                  'Betaling har feilet og grace period er utløpt. Oppdater betalingskort/vent på nytt forsøk før baren kan bli synlig.',
              },
              { status: 400 },
            );
          }
        }
      }

      update.isVisible = body.isVisible;
    }

    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      update.name = body.name.trim();
    }

    if ('address' in body) {
      if (typeof body.address !== 'string' || !body.address.trim()) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      update.address = body.address.trim();
    }

    if ('city' in body) {
      if (typeof body.city !== 'string') {
        return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
      }
      update.city = body.city.trim();
    }

    if ('country' in body) {
      if (typeof body.country !== 'string') {
        return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
      }
      update.country = body.country.trim();
    }

    if ('location' in body) {
      const loc = body.location as { lat?: unknown; lng?: unknown } | null;
      const lat = typeof loc?.lat === 'number' ? loc.lat : Number(loc?.lat);
      const lng = typeof loc?.lng === 'number' ? loc.lng : Number(loc?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      }
      update.location = { lat, lng };
    }

    const hasFields = Object.keys(update).some((k) => k !== 'updatedAt');
    if (!hasFields) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await barRef.set(update, { merge: true });

    // Minimal audit log for superadmin visibility toggles.
    if (me.role === 'superadmin' && 'isVisible' in body && typeof body.isVisible === 'boolean') {
      void logAdminAction({
        adminUid: uid,
        barId,
        action: 'bars.setVisible',
        details: {
          from: typeof barData.isVisible === 'boolean' ? barData.isVisible : null,
          to: body.isVisible,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
