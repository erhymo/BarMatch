import { NextRequest, NextResponse } from 'next/server';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getCompetitionByKey } from '@/lib/config/competitions';
import {
  mapApiFootballFixtureToFixture,
  type ApiFootballFixtureLike,
} from '@/lib/providers/fixtures/apiFootballMapper';

const DEFAULT_RANGE_DAYS = 14;
const API_BASE_URL = 'https://v3.football.api-sports.io/';
const IN_MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutter dev-cache

type CacheEntry = {
  createdAt: number;
  fixtures: Fixture[];
};

const memoryCache = new Map<string, CacheEntry>();

let hasLoggedEnv = false;

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

function hasNonEmptyErrors(errors: unknown): boolean {
  if (errors === null || errors === undefined) return false;

  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  if (typeof errors === 'string') {
    return errors.trim().length > 0;
  }

  if (typeof errors === 'object') {
    return Object.keys(errors as Record<string, unknown>).length > 0;
  }

  // number/boolean/etc: treat truthy as an error indicator
  return Boolean(errors);
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
  try {
    const { searchParams } = new URL(req.url);

    // Debug-modus for produksjon: lar oss se `results`/`errors` uten å lekke nøkler.
    // Eksempel: /api/fixtures?...&debug=1
    const debug = searchParams.get('debug') === '1';

    // Logg env ved første kall slik at vi ser om nøkkelen faktisk er tilgjengelig
    if (!hasLoggedEnv) {
      const hasKey = Boolean(process.env.APISPORTS_KEY);
      // NB: logger bare bool, ikke selve nøkkelen
      console.log('[/api/fixtures] APISPORTS_KEY present:', hasKey);
      if (!hasKey) {
        console.error(
          '[/api/fixtures] APISPORTS_KEY mangler. Sørg for at den er satt i .env.local og at dev-server er restartet etter endring.',
        );
      }
      hasLoggedEnv = true;
    }

    // Støtt både nytt navn (leagueKey) og tidligere (league) for kompatibilitet
    const leagueParamRaw = searchParams.get('leagueKey') ?? searchParams.get('league');

	    const fromParam = searchParams.get('from');
	    const toParam = searchParams.get('to');
	    const seasonParam = searchParams.get('season');
	
	    console.log('[/api/fixtures] Request params:', {
	      leagueKey: leagueParamRaw,
	      from: fromParam,
	      to: toParam,
	      season: seasonParam,
	    });
	
	    if (!isLeagueKey(leagueParamRaw)) {
	      console.error(
	        '[/api/fixtures] Ugyldig eller manglende leagueKey-parameter:',
	        leagueParamRaw,
	      );
      return NextResponse.json(
        {
          error: 'Ugyldig eller manglende leagueKey-parameter',
          status: 400,
          details: `leagueKey må være en av: NOR_ELITESERIEN, EPL, SERIE_A (fikk: ${leagueParamRaw})`,
        },
        { status: 400 },
      );
    }

    const leagueParam = leagueParamRaw;

    const { from: defaultFrom, to: defaultTo } = getDefaultRange();

    const fromIso = fromParam ?? defaultFrom;
    const toIso = toParam ?? defaultTo;

	    let fromDate: string;
	    let toDate: string;
	    try {
	      fromDate = isoToDateOnly(fromIso);
	      toDate = isoToDateOnly(toIso);
	    } catch (error) {
	      const message =
	        error instanceof Error && error.message ? error.message : 'Invalid date';
	      console.error('[/api/fixtures] Ugyldig dato-parameter:', {
	        from: fromIso,
	        to: toIso,
	        message,
	      });
	      return NextResponse.json(
	        {
	          error: 'Ugyldig from/to dato-parameter',
	          status: 400,
	          details: message,
	        },
	        { status: 400 },
	      );
	    }

    const apiKey = process.env.APISPORTS_KEY;
    if (!apiKey) {
      console.error(
        '[/api/fixtures] APISPORTS_KEY er ikke satt i miljøvariabler. Avbryter kall mot API-Football.',
      );
      return NextResponse.json(
        {
          error: 'APISPORTS_KEY er ikke satt i miljøvariabler',
          status: 500,
          details:
            'Sett APISPORTS_KEY i .env.local og restart dev-server eller Vercel-deploy etter endring.',
        },
        { status: 500 },
      );
    }

	    const competition = getCompetitionByKey(leagueParam);
	    const leagueId = competition.apiFootballLeagueId;

	    if (!leagueId) {
      console.error(
        '[/api/fixtures] Mangler apiFootballLeagueId for leagueKey=',
        leagueParam,
      );
      return NextResponse.json(
        {
          error: `Missing competition id mapping for ${leagueParam}`,
          status: 400,
          details:
            'Legg til apiFootballLeagueId i COMPETITIONS-konfigurasjonen for denne ligaen.',
        },
        { status: 400 },
      );
    }

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
      if (process.env.NODE_ENV !== 'production') {
        console.log('[/api/fixtures] Serving fixtures from in-memory cache for', {
          league: leagueParam,
          fromDate,
          toDate,
          season,
        });
      }
      return NextResponse.json({ fixtures: cached.fixtures });
    }

    const url = new URL(`${API_BASE_URL}fixtures`);
    url.searchParams.set('league', String(leagueId));
    url.searchParams.set('season', String(season));
    url.searchParams.set('from', fromDate);
    url.searchParams.set('to', toDate);

    // Nyttig debug: eksakt URL, parametere og om nøkkelen er synlig
    console.log('[/api/fixtures] url:', url.toString());
    console.log(
      '[/api/fixtures] leagueKey:',
      leagueParam,
      'leagueId:',
      leagueId,
      'season:',
      season,
      'from:',
      fromDate,
      'to:',
      toDate,
    );
    console.log('[/api/fixtures] APISPORTS_KEY present:', Boolean(process.env.APISPORTS_KEY));

    const response = await fetch(url.toString(), {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: {
        // Enkle cache/rehydreringsregler for ikke-live fixtures
        revalidate: 3600,
      },
    });

    const status = response.status;
    const statusText = response.statusText;

    if (!response.ok) {
      const body = await response.text().catch(() => '');

      console.error('[/api/fixtures] API-Football error response', {
        status,
        statusText,
        url: url.toString(),
        body: body ? body.slice(0, 500) : '',
      });

      // Viktig: ikke kast Error her. Vi returnerer med faktisk statuskode slik at klienten
      // (ApiFootballFixtureProvider/Kamper-siden) kan vise korrekt HTTP-status og details.
      return NextResponse.json(
        {
          error: 'API-Football request failed',
          status,
          statusText,
          details: body,
        },
        { status },
      );
    }

    const json = (await response.json()) as {
      response?: ApiFootballFixtureLike[];
      results?: number;
      errors?: unknown;
    };

	    // API-Football kan i noen tilfeller returnere HTTP 200 med `errors` i body.
	    // Hvis vi ikke håndterer dette, ser klienten kun `{ fixtures: [] }`.
	    if (hasNonEmptyErrors(json.errors)) {
	      const details = safeJsonStringify({
	        errors: json.errors,
	        results: json.results,
	        request: {
	          leagueKey: leagueParam,
	          leagueId,
	          season,
	          from: fromDate,
	          to: toDate,
	        },
	      });

	      console.error('[/api/fixtures] API-Football returned errors in JSON body', {
	        url: url.toString(),
	        results: json.results,
	        errors: json.errors,
	      });

	      return NextResponse.json(
	        {
	          error: 'API-Football returned errors',
	          status: 502,
	          details,
	        },
	        { status: 502 },
	      );
	    }

    const rawFixtures: ApiFootballFixtureLike[] = Array.isArray(json.response)
      ? json.response
      : [];

    const fixtures: Fixture[] = rawFixtures.map((item) =>
      mapApiFootballFixtureToFixture(item, leagueParam),
    );

    memoryCache.set(cacheKey, { createdAt: now, fixtures });

	    if (debug) {
	      return NextResponse.json({
	        fixtures,
	        meta: {
	          results: json.results,
	          errors: json.errors,
	        },
	      });
	    }

	    return NextResponse.json({ fixtures });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Kunne ikke hente kamper';

    console.error('[/api/fixtures] Internal error:', error);

    return NextResponse.json(
      {
        error: 'Internal error',
        status: 500,
        details: message,
      },
      { status: 500 },
    );
  }
}

