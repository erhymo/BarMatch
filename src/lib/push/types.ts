/**
 * Push notification types
 *
 * Firestore collection: pushSubscriptions
 * Document ID: SHA-256 hash of deviceToken (to avoid duplicates)
 */

export type PushPlatform = 'ios' | 'android';

export interface PushSubscription {
  /** Device token — APNs hex string (iOS) or FCM registration token (Android) */
  deviceToken: string;
  /** Platform identifier */
  platform: PushPlatform;
  /** Team names the user wants notifications for (e.g. ["Arsenal", "Liverpool"]) */
  teams: string[];
  /** Bar IDs the user wants notifications for */
  barIds: string[];
  /** Whether this subscription is active */
  active: boolean;
  /** Firestore server timestamp */
  createdAt: FirebaseFirestore.Timestamp;
  /** Firestore server timestamp */
  updatedAt: FirebaseFirestore.Timestamp;
  /** Last time a notification was sent to this device */
  lastNotifiedAt?: FirebaseFirestore.Timestamp;
}

/** Request body for POST /api/push/register */
export interface PushRegisterRequest {
  deviceToken: string;
  platform: PushPlatform;
  teams?: string[];
  barIds?: string[];
}

/** Request body for POST /api/push/preferences */
export interface PushPreferencesRequest {
  deviceToken: string;
  teams?: string[];
  barIds?: string[];
}

/** APNs payload structure */
export interface ApnsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    sound?: string;
    badge?: number;
    'thread-id'?: string;
  };
  /** Custom data */
  fixtureId?: string;
  barId?: string;
}

/** FCM data message payload (used for Android) */
export interface FcmDataPayload {
  title: string;
  body: string;
  fixtureId?: string;
  barId?: string;
}

/** Common notification content used across platforms */
export interface NotificationContent {
  title: string;
  body: string;
  fixtureId?: string;
  barId?: string;
}

