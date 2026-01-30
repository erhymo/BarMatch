import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireFirebaseUser } from '@/lib/admin/serverAuth';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toMillisMaybe(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
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

function isExpired(expiresAt: unknown) {
  const ms = toMillisMaybe(expiresAt);
  return typeof ms === 'number' ? ms <= Date.now() : false;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireFirebaseUser(request);
    const email = decoded.email?.toLowerCase() ?? null;
    if (!email) return NextResponse.json({ error: 'Missing email on user' }, { status: 400 });

    const body = (await request.json()) as { inviteId?: unknown };
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : '';
    if (!inviteId) return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });

    const db = getFirebaseAdminDb();

    // If user already linked, just return.
    const existingBarUser = await db.collection('barUsers').doc(decoded.uid).get();
    if (existingBarUser.exists) {
      const data = asRecord(existingBarUser.data());
      const existingBarId = typeof data?.barId === 'string' ? data.barId : null;
      if (existingBarId) {
        return NextResponse.json({ ok: true, barId: existingBarId, alreadyLinked: true });
      }
    }

    const inviteRef = db.collection('invites').doc(inviteId);
    const barUsersRef = db.collection('barUsers').doc(decoded.uid);

    const created = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) {
        return { ok: false as const, error: 'Invite not found', status: 404 as const };
      }

      const invite = asRecord(inviteSnap.data());
      const inviteStatus = typeof invite?.status === 'string' ? invite.status : null;
      if (inviteStatus !== 'pending') {
        return { ok: false as const, error: 'Invite is not pending', status: 400 as const };
      }
      if (isExpired(invite?.expiresAt)) {
        tx.set(inviteRef, { status: 'expired', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return { ok: false as const, error: 'Invite expired', status: 400 as const };
      }

      const inviteEmail = typeof invite?.email === 'string' ? invite.email.toLowerCase() : null;
      if (!inviteEmail || inviteEmail !== email) {
        return { ok: false as const, error: 'Email does not match invite', status: 403 as const };
      }

      const existing = await tx.get(barUsersRef);
      if (existing.exists) {
        const data = asRecord(existing.data());
        const existingBarId = typeof data?.barId === 'string' ? data.barId : null;
        if (existingBarId) {
          return {
            ok: true as const,
            barId: existingBarId,
            alreadyLinked: true as const,
          };
        }
      }

      const trialDays = typeof invite?.trialDays === 'number' ? invite.trialDays : 0;
      const priceId = process.env.STRIPE_DEFAULT_PRICE_ID ?? null;
      const barId = randomUUID();

      tx.set(db.collection('bars').doc(barId), {
        email,
        isVisible: false,
        status: 'active',
        billingEnabled: false,
        billingStatus: 'unknown',
        emailVerified: Boolean(decoded.email_verified),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdFromInviteId: inviteId,
        stripe: {
          priceId,
          trialDays,
          customerId: null,
          subscriptionId: null,
          trialEndsAt: null,
          currentPeriodEnd: null,
          lastInvoiceStatus: null,
          lastPaymentFailedAt: null,
          gracePeriodEndsAt: null,
          reminders: { day7SentAt: null },
        },
      });

      tx.set(barUsersRef, {
        barId,
        role: 'owner',
        email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        inviteRef,
        {
          status: 'used',
          usedAt: FieldValue.serverTimestamp(),
          usedByUid: decoded.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return { ok: true as const, barId, alreadyLinked: false as const };
    });

    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }

    return NextResponse.json({ ok: true, barId: created.barId, alreadyLinked: created.alreadyLinked });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

