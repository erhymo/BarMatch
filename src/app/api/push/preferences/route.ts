import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { createHash } from 'crypto';
import type { PushPreferencesRequest } from '@/lib/push/types';

export const runtime = 'nodejs';

/**
 * POST /api/push/preferences
 *
 * Updates notification preferences (teams, barIds) for an existing subscription.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PushPreferencesRequest>;

    if (!body.deviceToken || typeof body.deviceToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid deviceToken' },
        { status: 400 },
      );
    }

    const deviceToken = body.deviceToken.trim();
    const docId = createHash('sha256').update(deviceToken).digest('hex');

    const db = getFirebaseAdminDb();
    const docRef = db.collection('pushSubscriptions').doc(docId);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: 'Subscription not found. Register first via /api/push/register.' },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (Array.isArray(body.teams)) {
      updateData.teams = body.teams.filter((t) => typeof t === 'string');
    }
    if (Array.isArray(body.barIds)) {
      updateData.barIds = body.barIds.filter((b) => typeof b === 'string');
    }

    await docRef.update(updateData);

    return NextResponse.json({ ok: true, id: docId });
  } catch (error) {
    console.error('[/api/push/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

