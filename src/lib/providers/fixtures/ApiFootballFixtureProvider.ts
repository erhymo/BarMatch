import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import type { FixtureProvider } from './FixtureProvider';

type FixturesResponse = {
  fixtures?: Fixture[];
  error?: string;
};

export class ApiFootballFixtureProvider implements FixtureProvider {
  private readonly basePath = '/api/fixtures';

  private async fetchFixtures(
    params: Record<string, string>,
  ): Promise<Fixture[]> {
    const searchParams = new URLSearchParams(params);
    const url = `${this.basePath}?${searchParams.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Kunne ikke hente kamper (${response.status}). ${text.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as FixturesResponse;

    if (!data.fixtures) {
      throw new Error(data.error || 'Uventet svar fra serveren (mangler fixtures)');
    }

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

