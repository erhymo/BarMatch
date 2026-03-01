import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { ALL_LEAGUE_KEYS } from '@/lib/config/competitions';
import { sendPushNotifications } from '@/lib/push/apns';
import type { ApnsPayload } from '@/lib/push/types';
import type { Fixture } from '@/lib/types/fixtures';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Hours ahead to look for upcoming fixtures */
const LOOKAHEAD_HOURS = 6;

function isCronAuthorized(request: Request) {
  if (request.headers.get('x-vercel-cron') === '1') return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get('authorization');
  const bearer = header?.match(/^Bearer (.+)$/i)?.[1];
  const alt = request.headers.get('x-cron-secret');
  return bearer === secret || alt === secret;
}

/**
 * Fetch fixtures for the next N hours across all leagues.
 * Calls the internal /api/fixtures endpoint.
 */
async function fetchUpcomingFixtures(): Promise<Fixture[]> {
  const baseUrl = process.env.APP_BASE_URL ?? 'https://where2watch.no';
  const now = new Date();
  const to = new Date(now.getTime() + LOOKAHEAD_HOURS * 60 * 60 * 1000);
  const fromIso = now.toISOString();
  const toIso = to.toISOString();

  const results = await Promise.allSettled(
    ALL_LEAGUE_KEYS.map(async (leagueKey) => {
      const url = `${baseUrl}/api/fixtures?leagueKey=${leagueKey}&from=${fromIso}&to=${toIso}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = (await res.json()) as { fixtures?: Fixture[] };
      return Array.isArray(json.fixtures) ? json.fixtures : [];
    }),
  );

  const all: Fixture[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirebaseAdminDb();

    // 1. Get all visible bars with their selected fixtures
    const barSnap = await db.collection('bars').where('isVisible', '==', true).limit(500).get();
    const barFixtureMap = new Map<string, { name: string; fixtureIds: string[] }>();

    for (const doc of barSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const name = typeof data.name === 'string' ? data.name : '';
      const selected = Array.isArray(data.selectedFixtureIds)
        ? (data.selectedFixtureIds as string[])
        : [];
      const cancelled = Array.isArray(data.cancelledFixtureIds)
        ? new Set(data.cancelledFixtureIds as string[])
        : new Set<string>();
      const active = selected.filter((id) => !cancelled.has(id));
      if (active.length > 0) {
        barFixtureMap.set(doc.id, { name, fixtureIds: active });
      }
    }

    if (barFixtureMap.size === 0) {
      return NextResponse.json({ ok: true, reason: 'No bars with fixtures', sent: 0 });
    }

    // 2. Fetch upcoming fixtures across all leagues
    const fixtures = await fetchUpcomingFixtures();
    const fixtureById = new Map(fixtures.map((f) => [f.id, f]));

    // 3. Build: barId → fixtures showing at this bar
    type BarMatch = { barId: string; barName: string; fixture: Fixture };
    const barMatches: BarMatch[] = [];

    for (const [barId, { name, fixtureIds }] of barFixtureMap) {
      for (const fid of fixtureIds) {
        const fixture = fixtureById.get(fid);
        if (fixture) {
          barMatches.push({ barId, barName: name, fixture });
        }
      }
    }

    if (barMatches.length === 0) {
      return NextResponse.json({ ok: true, reason: 'No upcoming fixtures at bars', sent: 0 });
    }

    // 4. Get active push subscriptions
    const subSnap = await db.collection('pushSubscriptions')
      .where('active', '==', true)
      .limit(5000)
      .get();

    if (subSnap.empty) {
      return NextResponse.json({ ok: true, reason: 'No subscribers', sent: 0 });
    }

    // 5. Match subscribers to bar matches
    const notifications: { token: string; payload: ApnsPayload }[] = [];
    const notifiedDocIds: string[] = [];

    for (const subDoc of subSnap.docs) {
      const sub = subDoc.data() as Record<string, unknown>;
      const deviceToken = typeof sub.deviceToken === 'string' ? sub.deviceToken : '';
      if (!deviceToken) continue;

      const subTeams = Array.isArray(sub.teams) ? new Set(sub.teams as string[]) : new Set<string>();
      const subBarIds = Array.isArray(sub.barIds) ? new Set(sub.barIds as string[]) : new Set<string>();

      // Find first matching bar+fixture for this subscriber
      for (const bm of barMatches) {
        const teamMatch = subTeams.has(bm.fixture.homeTeam) || subTeams.has(bm.fixture.awayTeam);
        const barMatch = subBarIds.has(bm.barId);

        if (teamMatch || barMatch) {
          const kickoff = new Date(bm.fixture.kickoffUtc);
          const timeStr = kickoff.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });

          notifications.push({
            token: deviceToken,
            payload: {
              aps: {
                alert: {
                  title: `${bm.fixture.homeTeam} – ${bm.fixture.awayTeam}`,
                  body: `Vises på ${bm.barName} kl. ${timeStr} ⚽`,
                },
                sound: 'default',
                'thread-id': 'match-alerts',
              },
              fixtureId: bm.fixture.id,
              barId: bm.barId,
            },
          });
          notifiedDocIds.push(subDoc.id);
          break; // One notification per subscriber per cron run
        }
      }
    }

    // 6. Send notifications
    let sentCount = 0;
    if (notifications.length > 0) {
      const tokens = notifications.map((n) => n.token);
      // Use the first payload for batch (simplified — all get the same notification)
      // For production, you'd send individual payloads
      const uniquePayloads = new Map<string, { payload: ApnsPayload; tokens: string[] }>();
      for (const n of notifications) {
        const key = JSON.stringify(n.payload);
        const entry = uniquePayloads.get(key);
        if (entry) { entry.tokens.push(n.token); }
        else { uniquePayloads.set(key, { payload: n.payload, tokens: [n.token] }); }
      }

      for (const { payload, tokens: batchTokens } of uniquePayloads.values()) {
        const results = await sendPushNotifications(batchTokens, payload);
        sentCount += results.filter((r) => r.success).length;

        // Deactivate tokens that got "Unregistered" or "BadDeviceToken"
        for (const r of results) {
          if (!r.success && (r.reason === 'Unregistered' || r.reason === 'BadDeviceToken')) {
            // Find and deactivate this subscription
            const subQuery = await db.collection('pushSubscriptions')
              .where('deviceToken', '==', r.deviceToken)
              .limit(1)
              .get();
            for (const doc of subQuery.docs) {
              await doc.ref.update({ active: false, updatedAt: FieldValue.serverTimestamp() });
            }
          }
        }
      }

      // Update lastNotifiedAt for notified subscriptions
      const batch = db.batch();
      for (const docId of notifiedDocIds) {
        batch.update(db.collection('pushSubscriptions').doc(docId), {
          lastNotifiedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      bars: barFixtureMap.size,
      upcomingFixtures: fixtures.length,
      barMatches: barMatches.length,
      subscribers: subSnap.size,
      matched: notifications.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error('[push-notify] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}

