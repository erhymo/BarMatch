import type { FixtureProvider } from './FixtureProvider';
import { MockFixtureProvider } from './MockFixtureProvider';
import { TheSportsDbFixtureProvider } from './TheSportsDbFixtureProvider';
import { ApiFootballFixtureProvider } from './ApiFootballFixtureProvider';

let cachedProvider: FixtureProvider | null = null;

export function getFixtureProvider(): FixtureProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerTypeRaw =
    (typeof window === 'undefined'
      ? process.env.FIXTURE_PROVIDER
      : process.env.NEXT_PUBLIC_FIXTURE_PROVIDER) || 'mock';

  const providerType = providerTypeRaw.toLowerCase();

  if (providerType === 'thesportsdb') {
    cachedProvider = new TheSportsDbFixtureProvider();
  } else if (providerType === 'apifootball') {
    cachedProvider = new ApiFootballFixtureProvider();
  } else {
    // Default til mock-provider for lokalutvikling og demo
    cachedProvider = new MockFixtureProvider();
  }

  return cachedProvider;
}

