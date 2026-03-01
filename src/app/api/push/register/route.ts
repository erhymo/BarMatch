import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { createHash } from 'crypto';
import type { PushRegisterRequest } from '@/lib/push/types';

export const runtime = 'nodejs';

/**
 * POST /api/push/register
 *
 * Receives a device token from the iOS app and upserts it in Firestore.
 * No auth required — anonymous users can register for push notifications.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PushRegisterRequest>;

    if (!body.deviceToken || typeof body.deviceToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid deviceToken' },
        { status: 400 },
      );
    }

    const deviceToken = body.deviceToken.trim();
    if (deviceToken.length < 10) {
      return NextResponse.json(
        { error: 'deviceToken too short' },
        { status: 400 },
      );
    }

    const platform = body.platform ?? 'ios';
    const teams = Array.isArray(body.teams) ? body.teams.filter((t) => typeof t === 'string') : [];
    const barIds = Array.isArray(body.barIds) ? body.barIds.filter((b) => typeof b === 'string') : [];

    // Use SHA-256 hash of token as document ID to prevent duplicates
    const docId = createHash('sha256').update(deviceToken).digest('hex');

    const db = getFirebaseAdminDb();
    const docRef = db.collection('pushSubscriptions').doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
      // Update token + mark active, preserve existing preferences if not provided
      const updateData: Record<string, unknown> = {
        deviceToken,
        platform,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (teams.length > 0) updateData.teams = teams;
      if (barIds.length > 0) updateData.barIds = barIds;

      await docRef.update(updateData);
    } else {
      // Create new subscription
      await docRef.set({
        deviceToken,
        platform,
        teams,
        barIds,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true, id: docId });
  } catch (error) {
    console.error('[/api/push/register] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

