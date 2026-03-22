import { expect, test } from '@playwright/test';

test.use({
  colorScheme: 'dark',
});

test('onboard page matches layout baseline', async ({ page }) => {
  await page.route('**/api/invites/validate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        invite: {
          email: 'layout-lock@where2watch.no',
          trialDays: 14,
        },
      }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
  });

  await page.goto('/onboard?token=layout-lock-token');

  await expect(page.getByRole('heading', { name: 'Kom i gang med baren din' })).toBeVisible();
  await expect(page.getByLabel('Invitert e-post')).toHaveValue('layout-lock@where2watch.no');
  await expect(page.getByRole('button', { name: 'Jeg er ny her' })).toBeVisible();

  await expect(page).toHaveScreenshot('onboard.png', {
    animations: 'disabled',
    fullPage: true,
  });
});