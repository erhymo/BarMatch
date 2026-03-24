import { expect, test } from '@playwright/test';
import { mockRatingsApi } from './helpers/mockRatingsApi';

test.use({
  colorScheme: 'dark',
});

test('admin login page matches layout baseline', async ({ page }) => {
  await mockRatingsApi(page);

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
  });

  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
  await expect(page.getByText('E-post eller brukernavn')).toBeVisible();
  await expect(page.getByText('Admin', { exact: true })).toBeVisible();
  await expect(page.getByText('Sjekker innlogging...')).toHaveCount(0);

  await expect(page).toHaveScreenshot('admin-login.png', {
    animations: 'disabled',
    fullPage: true,
  });
});