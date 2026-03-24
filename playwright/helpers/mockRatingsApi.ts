import type { Page } from '@playwright/test';

export async function mockRatingsApi(page: Page) {
  await page.route('**/api/ratings**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ratings: [] }),
    });
  });
}