import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token')?.trim();
  if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });

  const db = getFirebaseAdminDb();
  const ref = db.collection('invites').doc(token);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ ok: false, status: 'not_found' }, { status: 404 });

  const invite = asRecord(snap.data());
  const status = typeof invite?.status === 'string' ? invite.status : undefined;

  if (status !== 'pending') {
    return NextResponse.json({ ok: false, status: status ?? 'unknown' }, { status: 400 });
  }

  if (isExpired(invite?.expiresAt)) {
    await ref.set({ status: 'expired', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: false, status: 'expired' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    invite: {
      id: snap.id,
      email: typeof invite?.email === 'string' ? invite.email : null,
      trialDays: typeof invite?.trialDays === 'number' ? invite.trialDays : 0,
    },
  });
}

