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

const MAX_FIXTURE_IDS = 500;

function parseStringArrayField(params: {
  value: unknown;
  fieldName: string;
}): { ok: true; value: string[] } | { ok: false; error: string } {
  const { value, fieldName } = params;
  if (!Array.isArray(value)) {
    return { ok: false, error: `${fieldName} must be an array` };
  }

  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== 'string') {
      return { ok: false, error: `${fieldName} must be an array of strings` };
    }
    const trimmed = v.trim();
    if (!trimmed) {
      return { ok: false, error: `${fieldName} contains an empty string` };
    }
    out.push(trimmed);
  }

  const deduped = Array.from(new Set(out));
  if (deduped.length > MAX_FIXTURE_IDS) {
    return {
      ok: false,
      error: `${fieldName} is too large (max ${MAX_FIXTURE_IDS})`,
    };
  }

  return { ok: true, value: deduped };
}

function readStringArrayFromDoc(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
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

	    if ('phone' in body) {
	      if (typeof body.phone !== 'string') {
	        return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
	      }
	      update.phone = body.phone.trim();
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

	    if ('description' in body) {
	      if (typeof body.description !== 'string') {
	        return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
	      }
	      update.description = body.description.trim();
	    }

	    if ('specialOffers' in body) {
	      if (typeof body.specialOffers !== 'string') {
	        return NextResponse.json({ error: 'Invalid specialOffers' }, { status: 400 });
	      }
	      update.specialOffers = body.specialOffers.trim();
	    }

	    if ('facilities' in body) {
	      const rec = asRecord(body.facilities);
	      if (!rec) {
	        return NextResponse.json({ error: 'Invalid facilities' }, { status: 400 });
	      }

	      const facilities: Record<string, unknown> = {};

	      if ('screens' in rec) {
	        const v = rec.screens;
	        const n = typeof v === 'number' ? v : Number(v);
	        if (!Number.isFinite(n) || n <= 0) {
	          return NextResponse.json({ error: 'Invalid facilities.screens' }, { status: 400 });
	        }
	        facilities.screens = n;
	      }

	      const boolKeys = [
	        'hasFood',
	        'hasOutdoorSeating',
	        'hasWifi',
	        'hasProjector',
	        'servesWarmFood',
	        'servesSnacks',
	        'hasVegetarianOptions',
	        'familyFriendly',
	        'canReserveTable',
	      ] as const;

	      for (const key of boolKeys) {
	        if (key in rec) {
	          const v = rec[key];
	          if (typeof v !== 'boolean') {
	            return NextResponse.json({ error: `Invalid facilities.${key}` }, { status: 400 });
	          }
	          facilities[key] = v;
	        }
	      }

	      if ('capacity' in rec) {
	        const v = rec.capacity;
	        const n = typeof v === 'number' ? v : Number(v);
	        if (!Number.isFinite(n) || n <= 0) {
	          return NextResponse.json({ error: 'Invalid facilities.capacity' }, { status: 400 });
	        }
	        facilities.capacity = n;
	      }

	      update.facilities = facilities;
	    }

	    // Persisted fixture selection for public bar pages.
	    // Stored on the bar document as arrays of fixture IDs.
	    const hasSelected = 'selectedFixtureIds' in body;
	    const hasCancelled = 'cancelledFixtureIds' in body;
	    if (hasSelected || hasCancelled) {
	      const existingSelected = readStringArrayFromDoc(barData.selectedFixtureIds);
	      const existingCancelled = readStringArrayFromDoc(barData.cancelledFixtureIds);

	      let nextSelected = existingSelected;
	      let nextCancelled = existingCancelled;

	      if (hasSelected) {
	        const parsed = parseStringArrayField({
	          value: body.selectedFixtureIds,
	          fieldName: 'selectedFixtureIds',
	        });
	        if (!parsed.ok) {
	          return NextResponse.json({ error: parsed.error }, { status: 400 });
	        }
	        nextSelected = parsed.value;
	      }

	      if (hasCancelled) {
	        const parsed = parseStringArrayField({
	          value: body.cancelledFixtureIds,
	          fieldName: 'cancelledFixtureIds',
	        });
	        if (!parsed.ok) {
	          return NextResponse.json({ error: parsed.error }, { status: 400 });
	        }
	        nextCancelled = parsed.value;
	      }

	      // Ensure cancelled is always a subset of selected.
	      const selectedSet = new Set(nextSelected);
	      nextCancelled = nextCancelled.filter((id) => selectedSet.has(id));

	      // If selection changed, also keep cancelled list consistent.
	      if (hasSelected) {
	        update.selectedFixtureIds = nextSelected;
	        update.cancelledFixtureIds = nextCancelled;
	      } else if (hasCancelled) {
	        update.cancelledFixtureIds = nextCancelled;
	      }
	    }

	    const hasFields = Object.keys(update).some((k) => k !== 'updatedAt');
	    if (!hasFields) {
	      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
	    }

	    await barRef.set(update, { merge: true });

	    const changedFieldNames = Object.keys(update).filter((k) => k !== 'updatedAt');

	    // Audit log: visibility toggles (both bar-eier og superadmin).
	    if ('isVisible' in body && typeof body.isVisible === 'boolean') {
	      void logAdminAction({
	        adminUid: uid,
	        barId,
	        action: body.isVisible ? 'bar.visibility.on' : 'bar.visibility.off',
	        details: {
	          from: typeof barData.isVisible === 'boolean' ? barData.isVisible : null,
	          to: body.isVisible,
	        },
	      });
	    }

	    // Audit log: bar-eier oppdaterte barprofilen.
	    if (me.role === 'bar_owner' && changedFieldNames.length > 0) {
	      void logAdminAction({
	        adminUid: uid,
	        barId,
	        action: 'bar.profile.update',
	        details: {
	          fields: changedFieldNames,
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
