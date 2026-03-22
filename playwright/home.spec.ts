import { expect, test } from '@playwright/test';

test.use({
  colorScheme: 'dark',
  geolocation: { latitude: 59.9139, longitude: 10.7522 },
  permissions: ['geolocation'],
});

test('home page matches layout baseline', async ({ page }) => {
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
  });

  await page.goto('/?layoutLock=1');

  await expect(page.getByRole('button', { name: 'Lokasjon' })).toBeVisible();
  await expect(page.getByTestId('layout-lock-map-placeholder')).toBeVisible();

  await expect(page).toHaveScreenshot('home.png', {
    animations: 'disabled',
    fullPage: true,
  });
});