import { expect, test } from '@playwright/test';

test.use({
  colorScheme: 'dark',
});

test('varslinger page matches layout baseline', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
  });

  await page.goto('/varslinger');

  await expect(page.getByRole('heading', { name: 'Push-varsler' })).toBeVisible();
  await expect(page.getByText(/Push-varsler er kun tilgjengelig i Where2Watch-appen/)).toBeVisible();

  await expect(page).toHaveScreenshot('varslinger.png', {
    animations: 'disabled',
    fullPage: true,
  });
});