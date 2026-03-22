import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { sendHiddenDay14, sendPaymentReminderDay7 } from '@/lib/email/mailer';
import { tsToMs } from '@/lib/utils/time';
import { asRecord } from '@/lib/utils/unknown';

export const runtime = 'nodejs';

function isCronAuthorized(request: Request) {
  if (request.headers.get('x-vercel-cron') === '1') return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get('authorization');
  const bearer = header?.match(/^Bearer (.+)$/i)?.[1];
  const alt = request.headers.get('x-cron-secret');
  return bearer === secret || alt === secret;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const db = getFirebaseAdminDb();
  const snap = await db.collection('bars').where('billingStatus', '==', 'payment_failed').limit(500).get();

  let reminded = 0;
  let hidden = 0;

  for (const doc of snap.docs) {
    const barId = doc.id;
		const bar = doc.data() as Record<string, unknown>;
		const stripe = asRecord(bar.stripe);
		const reminders = asRecord(stripe?.reminders);

    const email = typeof bar.email === 'string' ? bar.email : null;
    const name = typeof bar.name === 'string' ? bar.name : undefined;
    const isVisible = Boolean(bar.isVisible);

		const lastFailedMs = tsToMs(stripe?.lastPaymentFailedAt);
    const graceEndsMs =
			tsToMs(stripe?.gracePeriodEndsAt) ??
			(typeof lastFailedMs === 'number' ? lastFailedMs + 14 * dayMs : null);
		const day7SentMs = tsToMs(reminders?.day7SentAt);

    // Day 7 reminder
    if (
      email &&
      typeof lastFailedMs === 'number' &&
      !day7SentMs &&
      now >= lastFailedMs + 7 * dayMs &&
      (typeof graceEndsMs !== 'number' || now < graceEndsMs)
    ) {
      try {
        await sendPaymentReminderDay7({ to: email, barName: name });
        await db
          .collection('bars')
          .doc(barId)
          .set({ 'stripe.reminders.day7SentAt': FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        reminded++;
      } catch (err) {
        console.error('Failed sending day7 reminder for', barId, err);
      }
    }

    // Day 14 hide
    if (email && isVisible && typeof graceEndsMs === 'number' && now >= graceEndsMs) {
      try {
        await db
          .collection('bars')
          .doc(barId)
          .set({ isVisible: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await sendHiddenDay14({ to: email, barName: name });
        hidden++;
      } catch (err) {
        console.error('Failed hiding bar after grace period for', barId, err);
      }
    }
  }

  return NextResponse.json({ ok: true, scanned: snap.size, reminded, hidden, now });
}

