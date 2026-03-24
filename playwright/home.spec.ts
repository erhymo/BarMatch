import { expect, test } from '@playwright/test';
import { mockRatingsApi } from './helpers/mockRatingsApi';

test.use({
  colorScheme: 'dark',
  geolocation: { latitude: 59.9139, longitude: 10.7522 },
  permissions: ['geolocation'],
});

test('home page matches layout baseline', async ({ page }) => {
  await mockRatingsApi(page);

  await page.route('**/api/bars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bars: [] }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
  });

  await page.goto('/?layoutLock=1');

  await expect(page.getByRole('button', { name: 'Lokasjon' })).toBeVisible();
  await expect(page.getByTestId('layout-lock-map-placeholder')).toBeVisible();

  await expect(page).toHaveScreenshot('home.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('home header keeps Hjem and Kamper visible in iOS native app on larger screens', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width < 768, 'desktop/tablet only');

  await mockRatingsApi(page);

  await page.route('**/api/bars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bars: [] }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
    window.webkit = {
      messageHandlers: {
        'push-permission-request': { postMessage: () => undefined },
        'push-permission-state': { postMessage: () => undefined },
      },
    };
  });

  await page.goto('/?layoutLock=1');

  await expect(page.getByRole('link', { name: 'Hjem' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kamper' })).toBeVisible();
});

test('home header keeps Hjem and Kamper hidden in Android native app on larger screens', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width < 768, 'desktop/tablet only');

  await mockRatingsApi(page);

  await page.route('**/api/bars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bars: [] }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
    window.AndroidBridge = {
      requestPushPermission: () => undefined,
      queryPushState: () => undefined,
    };
  });

  await page.goto('/?layoutLock=1');

  await expect(page.getByRole('link', { name: 'Hjem' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Kamper' })).toHaveCount(0);
});

test('home keeps mobile navigation on iPhone-sized iOS native screens', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width >= 768, 'mobile only');

  await mockRatingsApi(page);

  await page.route('**/api/bars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bars: [] }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
    window.webkit = {
      messageHandlers: {
        'push-permission-request': { postMessage: () => undefined },
        'push-permission-state': { postMessage: () => undefined },
      },
    };
  });

  await page.goto('/?layoutLock=1');

  const mobileNav = page.locator('nav.fixed.bottom-0');
  await expect(mobileNav.getByRole('link', { name: 'Hjem' })).toBeVisible();
  await expect(mobileNav.getByRole('link', { name: 'Kamper' })).toBeVisible();
});

test('home keeps mobile navigation on Android native mobile screens', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width >= 768, 'mobile only');

  await mockRatingsApi(page);

  await page.route('**/api/bars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ bars: [] }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
    window.AndroidBridge = {
      requestPushPermission: () => undefined,
      queryPushState: () => undefined,
    };
  });

  await page.goto('/?layoutLock=1');

  const mobileNav = page.locator('nav.fixed.bottom-0');
  await expect(mobileNav.getByRole('link', { name: 'Hjem' })).toBeVisible();
  await expect(mobileNav.getByRole('link', { name: 'Kamper' })).toBeVisible();
});