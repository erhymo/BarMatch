import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

import type { BarRating, UserRating } from '@/lib/models';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

function buildRatingDocId(barId: string, userId: string) {
  return encodeURIComponent(`${barId}__${userId}`);
}

function clampRating(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

function readTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Date) return value.toISOString();

  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    if (date instanceof Date) return date.toISOString();
  }

  return new Date().toISOString();
}

function readUserRating(barId: string, userId: string, data: Record<string, unknown> | undefined): UserRating | null {
  if (!data) return null;

  const ratingValue = typeof data.rating === 'number' ? data.rating : Number(data.rating);
  if (!Number.isFinite(ratingValue)) return null;

  return {
    barId,
    userId,
    rating: clampRating(ratingValue),
    timestamp: readTimestamp(data.updatedAt ?? data.createdAt),
  };
}

function toBarRating(barId: string, averageRating: number, totalRatings: number, userRating: UserRating | null): BarRating {
  return {
    barId,
    averageRating: totalRatings > 0 ? roundRating(averageRating) : 0,
    totalRatings: Math.max(0, totalRatings),
    ratings: userRating ? [userRating] : [],
  };
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId')?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const snap = await db.collection('ratings').where('userId', '==', userId).limit(200).get();

    const ratings = await Promise.all(snap.docs.map(async (doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const barId = typeof data.barId === 'string' ? data.barId : '';
      if (!barId) return null;

      const userRating = readUserRating(barId, userId, data);
      if (!userRating) return null;

      const barSnap = await db.collection('bars').doc(barId).get();
      const barData = (barSnap.data() ?? {}) as Record<string, unknown>;
      const averageRating = typeof barData.rating === 'number' ? barData.rating : 0;
      const totalRatings = typeof barData.ratingCount === 'number' ? barData.ratingCount : 0;

      return toBarRating(barId, averageRating, totalRatings, userRating);
    }));

    return NextResponse.json(
      { ratings: ratings.filter((rating): rating is BarRating => Boolean(rating)) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('GET /api/ratings failed', error);
    return NextResponse.json({ error: 'Failed to load ratings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: unknown; barId?: unknown; rating?: unknown };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const barId = typeof body.barId === 'string' ? body.barId.trim() : '';
    const ratingValue = typeof body.rating === 'number' ? body.rating : Number(body.rating);

    if (!userId || !barId || !Number.isFinite(ratingValue)) {
      return NextResponse.json({ error: 'Missing or invalid payload' }, { status: 400 });
    }

    const nextRating = clampRating(ratingValue);
    const db = getFirebaseAdminDb();
    const barRef = db.collection('bars').doc(barId);
    const ratingRef = db.collection('ratings').doc(buildRatingDocId(barId, userId));

    const result = await db.runTransaction(async (tx) => {
      const [barSnap, ratingSnap] = await Promise.all([tx.get(barRef), tx.get(ratingRef)]);
      if (!barSnap.exists) {
        return { ok: false as const, status: 404 as const, error: 'Bar not found' };
      }

      const barData = (barSnap.data() ?? {}) as Record<string, unknown>;
      const existingAverage = typeof barData.rating === 'number' ? barData.rating : 0;
      const existingCount = typeof barData.ratingCount === 'number' ? barData.ratingCount : 0;

      const existingRatingData = (ratingSnap.data() ?? {}) as Record<string, unknown>;
      const previousRatingRaw = typeof existingRatingData.rating === 'number'
        ? existingRatingData.rating
        : Number(existingRatingData.rating);
      const previousRating = Number.isFinite(previousRatingRaw) ? clampRating(previousRatingRaw) : null;

      const currentSum = existingAverage * existingCount;
      const nextCount = previousRating === null ? existingCount + 1 : existingCount;
      const nextSum = previousRating === null ? currentSum + nextRating : currentSum - previousRating + nextRating;
      const nextAverage = nextCount > 0 ? roundRating(nextSum / nextCount) : 0;

      tx.set(barRef, {
        rating: nextAverage,
        ratingCount: nextCount,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(ratingRef, {
        barId,
        userId,
        rating: nextRating,
        createdAt: ratingSnap.exists ? existingRatingData.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        ok: true as const,
        rating: toBarRating(barId, nextAverage, nextCount, {
          barId,
          userId,
          rating: nextRating,
          timestamp: new Date().toISOString(),
        }),
      };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, rating: result.rating }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('POST /api/ratings failed', error);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId')?.trim() ?? '';
    const barId = url.searchParams.get('barId')?.trim() ?? '';

    if (!userId || !barId) {
      return NextResponse.json({ error: 'Missing userId or barId' }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const barRef = db.collection('bars').doc(barId);
    const ratingRef = db.collection('ratings').doc(buildRatingDocId(barId, userId));

    const result = await db.runTransaction(async (tx) => {
      const [barSnap, ratingSnap] = await Promise.all([tx.get(barRef), tx.get(ratingRef)]);
      if (!barSnap.exists) {
        return { ok: false as const, status: 404 as const, error: 'Bar not found' };
      }

      const barData = (barSnap.data() ?? {}) as Record<string, unknown>;
      const existingAverage = typeof barData.rating === 'number' ? barData.rating : 0;
      const existingCount = typeof barData.ratingCount === 'number' ? barData.ratingCount : 0;

      if (!ratingSnap.exists) {
        return {
          ok: true as const,
          rating: toBarRating(barId, existingAverage, existingCount, null),
        };
      }

      const ratingData = (ratingSnap.data() ?? {}) as Record<string, unknown>;
      const previousRatingRaw = typeof ratingData.rating === 'number' ? ratingData.rating : Number(ratingData.rating);
      const previousRating = Number.isFinite(previousRatingRaw) ? clampRating(previousRatingRaw) : null;
      if (previousRating === null) {
        tx.delete(ratingRef);
        return {
          ok: true as const,
          rating: toBarRating(barId, existingAverage, existingCount, null),
        };
      }

      const currentSum = existingAverage * existingCount;
      const nextCount = Math.max(0, existingCount - 1);
      const nextSum = Math.max(0, currentSum - previousRating);
      const nextAverage = nextCount > 0 ? roundRating(nextSum / nextCount) : 0;

      tx.set(barRef, {
        rating: nextAverage,
        ratingCount: nextCount,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.delete(ratingRef);

      return {
        ok: true as const,
        rating: toBarRating(barId, nextAverage, nextCount, null),
      };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, rating: result.rating }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('DELETE /api/ratings failed', error);
    return NextResponse.json({ error: 'Failed to remove rating' }, { status: 500 });
  }
}