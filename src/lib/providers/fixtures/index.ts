import type { FixtureProvider } from './FixtureProvider';
import { MockFixtureProvider } from './MockFixtureProvider';
import { TheSportsDbFixtureProvider } from './TheSportsDbFixtureProvider';

let cachedProvider: FixtureProvider | null = null;

export function getFixtureProvider(): FixtureProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = (process.env.FIXTURE_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'thesportsdb') {
    cachedProvider = new TheSportsDbFixtureProvider();
  } else {
    // Default til mock-provider for lokalutvikling og demo
    cachedProvider = new MockFixtureProvider();
  }

  return cachedProvider;
}

