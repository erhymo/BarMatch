import { expect, test } from '@playwright/test';

test.use({
  colorScheme: 'dark',
});

test('admin login page matches layout baseline', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
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