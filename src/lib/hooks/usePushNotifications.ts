'use client';

import { useCallback, useEffect, useState } from 'react';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unknown';

interface PushState {
  /** Whether we are inside the iOS WKWebView app */
  isIOSApp: boolean;
  /** Current push permission status */
  permissionStatus: PushPermissionStatus;
  /** APNs device token (hex string) */
  deviceToken: string | null;
  /** Whether preferences are being saved */
  isSaving: boolean;
}

/**
 * Hook for managing push notification state within the iOS WKWebView app.
 *
 * Detects the iOS app environment via `window.webkit?.messageHandlers`,
 * listens for CustomEvents dispatched from Swift, and provides methods
 * to request permission and save notification preferences.
 */
export function usePushNotifications() {
  const [isIOSApp, setIsIOSApp] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('unknown');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detect iOS WKWebView environment
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasWebkit =
      !!(window as any).webkit?.messageHandlers?.['push-permission-request'];

    setIsIOSApp(hasWebkit);

    if (hasWebkit) {
      // Ask iOS for current push state on mount
      try {
        (window as any).webkit.messageHandlers['push-permission-state'].postMessage({});
      } catch {
        // ignore
      }
    }
  }, []);

  // Listen for CustomEvents from the iOS bridge
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

  /** Request push permission from the iOS app */
  const requestPermission = useCallback(() => {
    try {
      (window as any).webkit?.messageHandlers?.['push-permission-request']?.postMessage({});
    } catch {
      // ignore
    }
  }, []);

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
    isIOSApp,
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

