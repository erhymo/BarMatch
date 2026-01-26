/**
 * BarFixtureSelectionService
 * Platform-agnostic helpers for storing which fixtures a bar has chosen to show.
 */

export const BAR_FIXTURE_STORAGE_KEYS = {
  selectedFixtureIds: (barId: string) => `where2watch_bar_${barId}_fixtures`,
  cancelledFixtureIds: (barId: string) => `where2watch_bar_${barId}_cancelled_fixtures`,
} as const;

function safeParseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export class BarFixtureSelectionService {
  static loadSelectedFixtureIds(barId: string, storage: Storage): string[] {
    return safeParseStringArray(storage.getItem(BAR_FIXTURE_STORAGE_KEYS.selectedFixtureIds(barId)));
  }

  static saveSelectedFixtureIds(barId: string, fixtureIds: string[], storage: Storage): void {
    try {
      storage.setItem(
        BAR_FIXTURE_STORAGE_KEYS.selectedFixtureIds(barId),
        JSON.stringify(Array.from(new Set(fixtureIds))),
      );
    } catch (error) {
      console.error('Failed to save selected fixture ids:', error);
    }
  }

  static loadCancelledFixtureIds(barId: string, storage: Storage): string[] {
    return safeParseStringArray(storage.getItem(BAR_FIXTURE_STORAGE_KEYS.cancelledFixtureIds(barId)));
  }

  static saveCancelledFixtureIds(barId: string, fixtureIds: string[], storage: Storage): void {
    try {
      storage.setItem(
        BAR_FIXTURE_STORAGE_KEYS.cancelledFixtureIds(barId),
        JSON.stringify(Array.from(new Set(fixtureIds))),
      );
    } catch (error) {
      console.error('Failed to save cancelled fixture ids:', error);
    }
  }
}
