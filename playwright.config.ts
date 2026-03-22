import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] } },
    { name: 'ipad-pro-11-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_E2E_LAYOUT_LOCK: '1',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'fake',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'fake.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fake-project',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'fake.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:fake',
    },
  },
});