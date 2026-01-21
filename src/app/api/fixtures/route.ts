import { NextRequest, NextResponse } from 'next/server';
import { getFixtureProvider } from '@/lib/providers/fixtures';
import type { LeagueKey } from '@/lib/types/fixtures';

const DEFAULT_RANGE_DAYS = 14;

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const leagueParam = searchParams.get('league');

  if (!isLeagueKey(leagueParam)) {
    return NextResponse.json(
      { error: 'Ugyldig eller manglende league-parameter' },
      { status: 400 },
    );
  }

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const { from: defaultFrom, to: defaultTo } = getDefaultRange();

  const from = fromParam ?? defaultFrom;
  const to = toParam ?? defaultTo;

  const provider = getFixtureProvider();

  try {
    const fixtures = await provider.getUpcomingFixtures(leagueParam, from, to);
    return NextResponse.json({ fixtures });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Kunne ikke hente kamper';

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

