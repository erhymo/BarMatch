import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseClientApp() {
  if (getApps().length > 0) return getApps()[0]!;

  const cfg = getFirebaseClientConfig();
  // Delay throwing until runtime usage (keeps builds happy in environments without env vars)
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
    throw new Error(
      'Missing Firebase client env vars (NEXT_PUBLIC_FIREBASE_*). Check your .env.local / Vercel env.',
    );
  }

  return initializeApp(cfg);
}

export function getFirebaseAuthClient() {
  return getAuth(getFirebaseClientApp());
}
