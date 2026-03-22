import type { FixtureProvider } from './FixtureProvider';
import { ApiFootballFixtureProvider } from './ApiFootballFixtureProvider';

let cachedProvider: FixtureProvider | null = null;

export function getFixtureProvider(): FixtureProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  cachedProvider = new ApiFootballFixtureProvider();

  return cachedProvider;
}

