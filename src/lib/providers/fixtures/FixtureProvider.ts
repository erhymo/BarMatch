import type { Fixture, LeagueKey } from '@/lib/types/fixtures';

export interface FixtureProvider {
  getUpcomingFixtures(
    league: LeagueKey,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]>;

  getFixturesByTeam?(
    league: LeagueKey,
    teamName: string,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]>;
}

