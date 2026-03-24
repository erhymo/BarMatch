import { expect, test } from '@playwright/test';
import { mockRatingsApi } from './helpers/mockRatingsApi';

type FixtureRecord = {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string;
};

const FIXTURES_BY_LEAGUE: Record<string, FixtureRecord[]> = {
  EPL: [
    {
      id: 'epl-arsenal-liverpool',
      league: 'EPL',
      homeTeam: 'Arsenal',
      awayTeam: 'Liverpool',
      kickoffUtc: '2026-03-25T19:30:00Z',
    },
    {
      id: 'epl-tottenham-city',
      league: 'EPL',
      homeTeam: 'Tottenham',
      awayTeam: 'Man City',
      kickoffUtc: '2026-03-25T20:15:00Z',
    },
  ],
  UCL: [
    {
      id: 'ucl-bayern-psg',
      league: 'UCL',
      homeTeam: 'Bayern',
      awayTeam: 'PSG',
      kickoffUtc: '2026-03-26T20:00:00Z',
    },
  ],
  NOR_ELITESERIEN: [
    {
      id: 'nor-molde-brann',
      league: 'NOR_ELITESERIEN',
      homeTeam: 'Molde',
      awayTeam: 'Brann',
      kickoffUtc: '2026-03-27T17:00:00Z',
    },
  ],
};

test.use({
  colorScheme: 'dark',
});

test('matches page matches layout baseline', async ({ page }) => {
  await mockRatingsApi(page);

  await page.route('**/api/fixtures**', async (route) => {
    const url = new URL(route.request().url());
    const leagueKey = url.searchParams.get('leagueKey');
    const fixtures = leagueKey ? FIXTURES_BY_LEAGUE[leagueKey] ?? [] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fixtures }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('w2w_locale', 'no');
    window.localStorage.setItem('where2watch_user_id', 'layout-lock-user');
  });

  await page.goto('/kamper?layoutLock=1');

  await expect(page.getByRole('heading', { name: 'Kamper' })).toBeVisible();
  await expect(page.getByText('Arsenal')).toBeVisible();
  await expect(page.getByText('Bayern')).toBeVisible();

  await expect(page).toHaveScreenshot('matches.png', {
    animations: 'disabled',
    fullPage: true,
  });
});