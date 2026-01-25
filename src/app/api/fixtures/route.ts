import { NextRequest, NextResponse } from 'next/server';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getCompetitionByKey } from '@/lib/config/competitions';
import { mapApiFootballFixtureToFixture } from '@/lib/providers/fixtures/apiFootballMapper';

const DEFAULT_RANGE_DAYS = 14;
const API_BASE_URL = 'https://v3.football.api-sports.io/';
const IN_MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutter dev-cache

type CacheEntry = {
  createdAt: number;
  fixtures: Fixture[];
};

const memoryCache = new Map<string, CacheEntry>();

function isLeagueKey(value: string | null): value is LeagueKey {
  return value === 'NOR_ELITESERIEN' || value === 'EPL' || value === 'SERIE_A';
}

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString();
  const toDate = new Date(now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  const to = toDate.toISOString();
  return { from, to };
}

function isoToDateOnly(iso: string): string {
  const dt = new Date(iso);

  if (Number.isNaN(dt.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  // YYYY-MM-DD
  return dt.toISOString().slice(0, 10);
}

function getApiFootballLeagueId(league: LeagueKey): number {
  const competition = getCompetitionByKey(league);

  if (!competition.apiFootballLeagueId) {
    throw new Error(`Missing leagueId mapping for ${league}`);
  }

  return competition.apiFootballLeagueId;
}

function buildCacheKey(
  league: LeagueKey,
  fromDate: string,
  toDate: string,
  season: number,
): string {
  return `${league}|${fromDate}|${toDate}|${season}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Støtt både nytt navn (leagueKey) og tidligere (league) for kompatibilitet
  const leagueParam = searchParams.get('leagueKey') ?? searchParams.get('league');

  if (!isLeagueKey(leagueParam)) {
    return NextResponse.json(
      { error: 'Ugyldig eller manglende leagueKey-parameter' },
      { status: 400 },
    );
  }

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const seasonParam = searchParams.get('season');

  const { from: defaultFrom, to: defaultTo } = getDefaultRange();

  const fromIso = fromParam ?? defaultFrom;
  const toIso = toParam ?? defaultTo;

  const fromDate = isoToDateOnly(fromIso);
  const toDate = isoToDateOnly(toIso);

  const apiKey = process.env.APISPORTS_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'APISPORTS_KEY er ikke satt i miljøvariabler' },
      { status: 500 },
    );
  }

  const competition = getCompetitionByKey(leagueParam);

  let season: number;
  if (seasonParam && !Number.isNaN(Number(seasonParam))) {
    season = Number(seasonParam);
  } else if (competition.defaultSeason) {
    season = competition.defaultSeason;
  } else {
    const fromDateObj = new Date(fromIso);
    season = Number.isNaN(fromDateObj.getTime())
      ? new Date().getUTCFullYear()
      : fromDateObj.getUTCFullYear();
  }

  const cacheKey = buildCacheKey(leagueParam, fromDate, toDate, season);
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && now - cached.createdAt < IN_MEMORY_TTL_MS) {
    return NextResponse.json({ fixtures: cached.fixtures });
  }

  try {
    const leagueId = getApiFootballLeagueId(leagueParam);

    const url = new URL(`${API_BASE_URL}fixtures`);
    url.searchParams.set('league', String(leagueId));
    url.searchParams.set('season', String(season));
    url.searchParams.set('from', fromDate);
    url.searchParams.set('to', toDate);

    const response = await fetch(url.toString(), {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: {
        // Enkle cache/rehydreringsregler for ikke-live fixtures
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `API-Football: ${response.status} ${response.statusText} - ${body.slice(
          0,
          200,
        )}`,
      );
    }

    const json = (await response.json()) as {
      response?: unknown[];
      results?: number;
      errors?: unknown;
    };

    const rawFixtures = Array.isArray(json.response) ? json.response : [];

    const fixtures: Fixture[] = rawFixtures.map((item) =>
      mapApiFootballFixtureToFixture(item as any, leagueParam),
    );

    memoryCache.set(cacheKey, { createdAt: now, fixtures });

    return NextResponse.json({ fixtures });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Kunne ikke hente kamper';

    console.error('[API /api/fixtures] Feil ved henting av kamper:', error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

