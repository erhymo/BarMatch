import { useSyncExternalStore } from 'react';

export type NativeAppPlatform = 'ios' | 'android' | null;

interface NativeMessageHandler {
  postMessage(message: unknown): void;
}

interface IOSMessageHandlers {
  'push-permission-request'?: NativeMessageHandler;
  'push-permission-state'?: NativeMessageHandler;
}

export interface AndroidBridge {
  requestPushPermission(): void;
  queryPushState(): void;
  isAndroidApp?(): boolean;
}

declare global {
  interface Window {
    webkit?: { messageHandlers?: IOSMessageHandlers };
    AndroidBridge?: AndroidBridge;
  }
}

const noopSubscribe = () => () => {};

export function detectNativeAppPlatform(): NativeAppPlatform {
  if (typeof window === 'undefined') return null;
  if (window.webkit?.messageHandlers?.['push-permission-request']) return 'ios';
  if (window.AndroidBridge) return 'android';
  return null;
}

export function useNativeAppPlatform(): NativeAppPlatform {
  return useSyncExternalStore(noopSubscribe, detectNativeAppPlatform, () => null);
}

export function queryNativePushState(platform: NativeAppPlatform): void {
  if (typeof window === 'undefined') return;

  if (platform === 'ios') {
    window.webkit?.messageHandlers?.['push-permission-state']?.postMessage({});
    return;
  }

  if (platform === 'android') {
    window.AndroidBridge?.queryPushState();
  }
}

export function requestNativePushPermission(platform: NativeAppPlatform): void {
  if (typeof window === 'undefined') return;

  if (platform === 'android') {
    window.AndroidBridge?.requestPushPermission();
    return;
  }

  if (platform === 'ios') {
    window.webkit?.messageHandlers?.['push-permission-request']?.postMessage({});
  }
}