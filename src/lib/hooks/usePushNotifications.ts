'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  queryNativePushState,
  requestNativePushPermission,
  useNativeAppPlatform,
} from '@/lib/push/nativeApp';
import type { NativeAppPlatform } from '@/lib/push/nativeApp';
export type { NativeAppPlatform } from '@/lib/push/nativeApp';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unknown';

interface PushState {
  /** Whether we are inside a native app (iOS or Android) */
  isNativeApp: boolean;
  /** Whether we are inside the iOS WKWebView app (backward compat) */
  isIOSApp: boolean;
  /** Whether we are inside the Android WebView app */
  isAndroidApp: boolean;
  /** Which native platform we're on, or null for web */
  platform: NativeAppPlatform;
  /** Current push permission status */
  permissionStatus: PushPermissionStatus;
  /** Device token — APNs hex (iOS) or FCM token (Android) */
  deviceToken: string | null;
  /** Whether preferences are being saved */
  isSaving: boolean;
}

/**
 * Hook for managing push notification state within native app wrappers.
 *
 * Supports both:
 *   - iOS: detects via `window.webkit?.messageHandlers`
 *   - Android: detects via `window.AndroidBridge`
 *
 * Both platforms dispatch the same CustomEvents (push-permission-result,
 * push-state, push-token), so the event listeners work identically.
 */
export function usePushNotifications() {
  const platform = useNativeAppPlatform();
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('unknown');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isIOSApp = platform === 'ios';
  const isAndroidApp = platform === 'android';
  const isNativeApp = platform !== null;

  // Ask the native wrapper for the current push state when available.
  useEffect(() => {
    if (!platform) return;

    try {
      queryNativePushState(platform);
    } catch {
      // ignore
    }
  }, [platform]);

  // Listen for CustomEvents from the native bridge (same events on both platforms)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPermissionResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status) setPermissionStatus(detail.status);
    };

    const onPushState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status) setPermissionStatus(detail.status);
      if (detail?.token) setDeviceToken(detail.token);
    };

    const onPushToken = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.token) setDeviceToken(detail.token);
    };

    window.addEventListener('push-permission-result', onPermissionResult);
    window.addEventListener('push-state', onPushState);
    window.addEventListener('push-token', onPushToken);

    return () => {
      window.removeEventListener('push-permission-result', onPermissionResult);
      window.removeEventListener('push-state', onPushState);
      window.removeEventListener('push-token', onPushToken);
    };
  }, []);

  /** Request push permission from the native app */
  const requestPermission = useCallback(() => {
    try {
      requestNativePushPermission(platform);
    } catch {
      // ignore
    }
  }, [platform]);

  /** Save push notification preferences (teams & bars) to the backend */
  const savePreferences = useCallback(
    async (teams: string[], barIds: string[]) => {
      if (!deviceToken) return;
      setIsSaving(true);
      try {
        const res = await fetch('/api/push/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceToken, teams, barIds }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Feil (${res.status})`);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [deviceToken],
  );

  return {
    isNativeApp,
    isIOSApp,
    isAndroidApp,
    platform,
    permissionStatus,
    deviceToken,
    isSaving,
    requestPermission,
    savePreferences,
  } satisfies PushState & {
    requestPermission: () => void;
    savePreferences: (teams: string[], barIds: string[]) => Promise<void>;
  };
}

