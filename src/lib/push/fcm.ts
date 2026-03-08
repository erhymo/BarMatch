/**
 * Firebase Cloud Messaging (FCM) sender for Android push notifications.
 *
 * Uses firebase-admin SDK which is already configured in this project.
 * FCM tokens are registered via POST /api/push/register with platform: 'android'.
 */

import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import type { FcmDataPayload } from './types';

export interface FcmSendResult {
  deviceToken: string;
  success: boolean;
  messageId?: string;
  reason?: string;
}

/**
 * Send a data-only push notification to a single Android device via FCM.
 * We use data messages (not notification messages) so the app always controls display.
 */
export async function sendFcmNotification(
  deviceToken: string,
  payload: FcmDataPayload,
): Promise<FcmSendResult> {
  try {
    const app = getFirebaseAdminApp();
    const messaging = getMessaging(app);

    const message: Message = {
      token: deviceToken,
      data: {
        title: payload.title,
        body: payload.body,
        ...(payload.fixtureId ? { fixtureId: payload.fixtureId } : {}),
        ...(payload.barId ? { barId: payload.barId } : {}),
      },
      android: {
        priority: 'high' as const,
      },
    };

    const messageId = await messaging.send(message);
    return { deviceToken, success: true, messageId };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown error';

    return {
      deviceToken,
      success: false,
      reason,
    };
  }
}

/**
 * Send push notifications to multiple Android devices via FCM.
 */
export async function sendFcmNotifications(
  deviceTokens: string[],
  payload: FcmDataPayload,
): Promise<FcmSendResult[]> {
  // Send in parallel, max 50 concurrent
  const batchSize = 50;
  const results: FcmSendResult[] = [];

  for (let i = 0; i < deviceTokens.length; i += batchSize) {
    const batch = deviceTokens.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((token) => sendFcmNotification(token, payload)),
    );
    results.push(...batchResults);
  }

  return results;
}

