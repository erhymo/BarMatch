/**
 * Apple Push Notification service (APNs) HTTP/2 client
 *
 * Uses the Token-Based (.p8 key) authentication method.
 * See: https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns
 *
 * Required env vars:
 *   APNS_KEY_ID      — Key ID from Apple Developer portal
 *   APNS_TEAM_ID     — Apple Developer Team ID
 *   APNS_KEY_P8      — Base64-encoded .p8 private key contents
 *   APNS_BUNDLE_ID   — App bundle ID (e.g. no.where2watch.app)
 *   APNS_ENVIRONMENT — "production" or "development" (default: "production")
 */

import { SignJWT, importPKCS8 } from 'jose';
import type { ApnsPayload } from './types';

const APNS_HOST_PRODUCTION = 'https://api.push.apple.com';
const APNS_HOST_SANDBOX = 'https://api.sandbox.push.apple.com';

/** JWT token cache — Apple recommends reusing tokens for ~20 min */
let cachedToken: { jwt: string; expiresAt: number } | null = null;

function getConfig() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const keyP8Base64 = process.env.APNS_KEY_P8;
  const bundleId = process.env.APNS_BUNDLE_ID ?? 'no.where2watch.app';
  const environment = process.env.APNS_ENVIRONMENT ?? 'production';

  if (!keyId || !teamId || !keyP8Base64) {
    throw new Error(
      'Missing APNs configuration. Set APNS_KEY_ID, APNS_TEAM_ID, and APNS_KEY_P8 env vars.',
    );
  }

  const keyPem = Buffer.from(keyP8Base64, 'base64').toString('utf-8');
  const host = environment === 'development' ? APNS_HOST_SANDBOX : APNS_HOST_PRODUCTION;

  return { keyId, teamId, keyPem, bundleId, host };
}

/**
 * Generate a signed JWT for APNs authentication.
 * Cached for 50 minutes (Apple allows up to 60 min).
 */
async function getApnsToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.jwt;
  }

  const { keyId, teamId, keyPem } = getConfig();
  const privateKey = await importPKCS8(keyPem, 'ES256');

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .sign(privateKey);

  // Cache for 50 minutes (Apple invalidates after 60)
  cachedToken = { jwt, expiresAt: now + 50 * 60 };
  return jwt;
}

export interface ApnsSendResult {
  deviceToken: string;
  success: boolean;
  statusCode?: number;
  reason?: string;
}

/**
 * Send a push notification to a single device via APNs HTTP/2.
 */
export async function sendPushNotification(
  deviceToken: string,
  payload: ApnsPayload,
): Promise<ApnsSendResult> {
  const { bundleId, host } = getConfig();
  const token = await getApnsToken();

  const url = `${host}/3/device/${deviceToken}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${token}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { deviceToken, success: true, statusCode: response.status };
    }

    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const reason = typeof body.reason === 'string' ? body.reason : response.statusText;

    return {
      deviceToken,
      success: false,
      statusCode: response.status,
      reason,
    };
  } catch (error) {
    return {
      deviceToken,
      success: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send push notifications to multiple devices.
 * Returns results for each device.
 */
export async function sendPushNotifications(
  deviceTokens: string[],
  payload: ApnsPayload,
): Promise<ApnsSendResult[]> {
  // Send in parallel, max 50 concurrent
  const batchSize = 50;
  const results: ApnsSendResult[] = [];

  for (let i = 0; i < deviceTokens.length; i += batchSize) {
    const batch = deviceTokens.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((token) => sendPushNotification(token, payload)),
    );
    results.push(...batchResults);
  }

  return results;
}

