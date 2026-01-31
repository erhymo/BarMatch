import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';
import { sendInviteEmail } from '@/lib/email/mailer';

const ALLOWED_TRIAL_DAYS = new Set([0, 7, 14, 30]);

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

function formatDateForEmail(d: Date) {
  try {
    return d.toLocaleDateString('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ['superadmin']);

    const db = getFirebaseAdminDb();
    const snap = await db.collection('invites').orderBy('createdAt', 'desc').limit(200).get();

    // Auto-expire any pending invites past expiresAt.
    const expiredRefs: FirebaseFirestore.DocumentReference[] = [];
    const invites = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const status = typeof data.status === 'string' ? data.status : null;
      if (status === 'pending' && isExpired(data.expiresAt)) {
        expiredRefs.push(d.ref);
        return { id: d.id, ...data, status: 'expired' };
      }
      return { id: d.id, ...data };
    });

    if (expiredRefs.length) {
      const batch = db.batch();
      for (const ref of expiredRefs) {
        batch.set(ref, { status: 'expired', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      await batch.commit();
    }

    return NextResponse.json({ invites });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { uid } = await requireRole(request, ['superadmin']);

    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) return NextResponse.json({ error: 'Missing APP_BASE_URL' }, { status: 500 });

    const body = (await request.json()) as { email?: unknown; trialDays?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const trialDays = typeof body.trialDays === 'number' ? body.trialDays : Number(body.trialDays);

    if (!email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (!Number.isFinite(trialDays) || !ALLOWED_TRIAL_DAYS.has(trialDays)) {
      return NextResponse.json({ error: 'Invalid trialDays' }, { status: 400 });
    }

    const inviteId = randomUUID();
    const now = Date.now();
    const expiresAt = Timestamp.fromMillis(now + 48 * 60 * 60 * 1000);
    const inviteLink = `${appBaseUrl}/onboard?token=${inviteId}`;
    const firstCharge = new Date(now + trialDays * 24 * 60 * 60 * 1000);

    const db = getFirebaseAdminDb();
    const inviteRef = db.collection('invites').doc(inviteId);

    await inviteRef.set({
      email,
      trialDays,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
      createdByAdminUid: uid,
      lastSentAt: null,
      resendCount: 0,
    });

    await sendInviteEmail({
      to: email,
      inviteLink,
      trialDays,
      firstChargeDateText: formatDateForEmail(firstCharge),
      expiresHours: 48,
    });

    await inviteRef.set({ lastSentAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ ok: true, inviteId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

