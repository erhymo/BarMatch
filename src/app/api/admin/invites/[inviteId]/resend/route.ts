import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/admin/serverAuth';
import { sendInviteEmail } from '@/lib/email/mailer';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    await requireRole(request, ['superadmin']);
    const { inviteId } = await params;

    const appBaseUrl = process.env.APP_BASE_URL;
    if (!appBaseUrl) return NextResponse.json({ error: 'Missing APP_BASE_URL' }, { status: 500 });

    const db = getFirebaseAdminDb();
    const ref = db.collection('invites').doc(inviteId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

		const invite = asRecord(snap.data());
		const status = typeof invite?.status === 'string' ? invite.status : null;
		if (status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 400 });
    }

		if (isExpired(invite?.expiresAt)) {
      await ref.set({ status: 'expired', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

		const email = typeof invite?.email === 'string' ? invite.email : null;
		const trialDays = typeof invite?.trialDays === 'number' ? invite.trialDays : 0;
    if (!email) return NextResponse.json({ error: 'Invite missing email' }, { status: 400 });

    const inviteLink = `${appBaseUrl}/onboard?token=${inviteId}`;
    const firstCharge = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    await sendInviteEmail({
      to: email,
      inviteLink,
      trialDays,
      firstChargeDateText: firstCharge.toISOString().slice(0, 10),
      expiresHours: 48,
    });

    await ref.set(
      {
        lastSentAt: FieldValue.serverTimestamp(),
        resendCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    const status = msg === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

