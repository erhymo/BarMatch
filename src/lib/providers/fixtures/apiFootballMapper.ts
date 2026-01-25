import type { Fixture, LeagueKey } from '@/lib/types/fixtures';

export type ApiFootballFixtureLike = {
  fixture?: {
    id?: number | string | null;
    date?: string | null;
    timestamp?: number | null;
    timezone?: string | null;
    venue?: {
      name?: string | null;
    } | null;
  } | null;
  league?: {
    round?: string | null;
  } | null;
  teams?: {
    home?: {
      name?: string | null;
    } | null;
    away?: {
      name?: string | null;
    } | null;
  } | null;
};

function toKickoffUtcFromApiFootball(
  fixture: ApiFootballFixtureLike['fixture'],
): string {
  if (fixture?.date) {
    const dt = new Date(fixture.date);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }

  if (typeof fixture?.timestamp === 'number') {
    const dt = new Date(fixture.timestamp * 1000);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }

  // Fallback til "nå" hvis vi ikke kan tolke dato/tid
  return new Date().toISOString();
}

export function mapApiFootballFixtureToFixture(
  apiFixture: ApiFootballFixtureLike,
  league: LeagueKey,
): Fixture {
  const homeTeam =
    apiFixture.teams?.home?.name?.trim() || 'Ukjent hjemmelag';
  const awayTeam =
    apiFixture.teams?.away?.name?.trim() || 'Ukjent bortelag';

  const round = apiFixture.league?.round || undefined;
  const venue =
    apiFixture.fixture?.venue?.name?.trim() || undefined;

  const idSource =
    apiFixture.fixture?.id ??
    `${league}-${homeTeam}-${awayTeam}-${apiFixture.fixture?.date ?? ''}`;

  return {
    id: String(idSource),
    league,
    homeTeam,
    awayTeam,
    kickoffUtc: toKickoffUtcFromApiFootball(apiFixture.fixture),
    round,
    venue,
  };
}

