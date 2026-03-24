import { expect, test } from '@playwright/test';
import { mockRatingsApi } from './helpers/mockRatingsApi';

test.use({
  colorScheme: 'dark',
});

test('varslinger page matches layout baseline', async ({ page }) => {
  await mockRatingsApi(page);

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
  });

  await page.goto('/varslinger');

  await expect(page.getByRole('heading', { name: 'Push-varsler' })).toBeVisible();
  await expect(page.getByText(/Push-varsler er kun tilgjengelig i Where2Watch-appen/)).toBeVisible();

  await expect(page).toHaveScreenshot('varslinger.png', {
    animations: 'disabled',
    fullPage: true,
  });
});