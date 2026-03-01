/**
 * Push notification types
 *
 * Firestore collection: pushSubscriptions
 * Document ID: SHA-256 hash of deviceToken (to avoid duplicates)
 */

export interface PushSubscription {
  /** APNs device token (hex string) */
  deviceToken: string;
  /** Platform identifier */
  platform: 'ios';
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
  platform: 'ios';
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

