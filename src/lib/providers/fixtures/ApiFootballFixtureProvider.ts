import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import type { FixtureProvider } from './FixtureProvider';

type FixturesResponse = {
  fixtures?: Fixture[];
  error?: string;
  status?: number;
  details?: string;
};

type FixturesError = Error & {
  status?: number;
  details?: string;
};

/** TTL-based in-memory cache — survives client-side navigation. */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const fixtureCache = new Map<string, { data: Fixture[]; ts: number }>();

function cacheKey(params: Record<string, string>): string {
  return Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
}

export class ApiFootballFixtureProvider implements FixtureProvider {
  private readonly basePath = '/api/fixtures';

  private async fetchFixtures(
    params: Record<string, string>,
  ): Promise<Fixture[]> {
    // Check cache first
    const ck = cacheKey(params);
    const cached = fixtureCache.get(ck);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ApiFootballFixtureProvider] Cache hit for', ck);
      }
      return cached.data;
    }

    const searchParams = new URLSearchParams(params);
    const url = `${this.basePath}?${searchParams.toString()}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[ApiFootballFixtureProvider] Henter fixtures fra', url);
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[ApiFootballFixtureProvider] Fetch mot /api/fixtures feilet (nettverk/klient):',
          error,
        );
      }
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    let data: FixturesResponse | null = null;
    let rawText: string | null = null;

    if (contentType.includes('application/json')) {
      try {
        data = (await response.json()) as FixturesResponse;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            '[ApiFootballFixtureProvider] Klarte ikke å parse JSON fra /api/fixtures:',
            error,
          );
        }
        data = null;
      }
    } else {
      rawText = await response.text().catch(() => '');
    }

	    if (!response.ok) {
	      const status = response.status;
	      const apiError = data?.error;
	      const apiDetails = data?.details ?? rawText ?? '';
	
	      if (process.env.NODE_ENV !== 'production') {
	        console.error('[ApiFootballFixtureProvider] /api/fixtures returnerte feil', {
	          url,
	          status,
	          error: apiError,
	          details: apiDetails ? apiDetails.slice(0, 300) : undefined,
	        });
	      }
	
	      const message = `Kunne ikke laste kamper (HTTP ${status}): ${
	        apiError || 'Ukjent feil fra /api/fixtures'
	      }`;
	
	      const err: FixturesError = new Error(message);
	      err.status = status;
	      if (apiDetails) {
	        err.details = apiDetails.slice(0, 1000);
	      }
	      throw err;
	    }

	    if (!data || !data.fixtures) {
	      const err: FixturesError = new Error(
	        'Uventet svar fra serveren (mangler fixtures)',
	      );
	      err.status = 500;
	      throw err;
	    }

    // Store in cache
    fixtureCache.set(ck, { data: data.fixtures, ts: Date.now() });
    return data.fixtures;
  }

  async getUpcomingFixtures(
    league: LeagueKey,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]> {
    return this.fetchFixtures({
      leagueKey: league,
      from: fromUtcIso,
      to: toUtcIso,
    });
  }

  async getFixturesByTeam(
    league: LeagueKey,
    teamName: string,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]> {
    const fixtures = await this.getUpcomingFixtures(league, fromUtcIso, toUtcIso);

    const normalized = teamName.trim().toLowerCase();
    if (!normalized) {
      return fixtures;
    }

    return fixtures.filter((fixture) => {
      const home = fixture.homeTeam.toLowerCase();
      const away = fixture.awayTeam.toLowerCase();
      return home.includes(normalized) || away.includes(normalized);
    });
  }
}

