import { Bar } from '../models';

/**
 * Bar Service
 * Platform-agnostic service for bar-related operations
 */

export class BarService {
  /**
   * Filter bars by team
   * Returns bars that show matches for the specified team
   */
  static filterBarsByTeam(bars: Bar[], teamId: string | null): Bar[] {
    // Vi har ikke lenger mock/demo-kobling mellom barer og kamper.
    // Inntil vi har ekte bar->kamp data (backend), skal kartet alltid vise alle barer.
    // (UI kan senere filtrere basert på ekte data.)
    void teamId;
    return bars;
  }

	  /**
	   * Filter bars by match
	   * Returns bars that show the specified match
	   */
	  static filterBarsByMatch(bars: Bar[], matchId: string | null): Bar[] {
	    // Vi har ikke lenger mock/demo-kobling mellom barer og kamper.
	    // Inntil vi har ekte bar->kamp data (backend), skal kartet alltid vise alle barer.
	    void matchId;
	    return bars;
	  }

  /**
   * Sort bars: favorites first, then by name
   */
  static sortBars(bars: Bar[], favoriteBarIds: string[]): Bar[] {
    return bars.sort((a, b) => {
      const aIsFavorite = favoriteBarIds.includes(a.id);
      const bIsFavorite = favoriteBarIds.includes(b.id);

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get opening hours for a specific day
   */
  static getOpeningHoursForDay(
    bar: Bar,
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  ): string {
    return bar.openingHours?.[day] || 'Stengt';
  }

  /**
   * Get upcoming matches for a bar
   */
  static getUpcomingMatches(bar: Bar): NonNullable<typeof bar.matches> {
    // Barer har ikke lenger innebygde mock-kamper.
    // Kommende kamper for en bar krever ekte data fra backend.
    void bar;
    return [];
  }

  /**
   * Calculate distance between two positions (Haversine formula)
   * Returns distance in kilometers
   */
  static calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(pos2.lat - pos1.lat);
    const dLon = this.toRad(pos2.lng - pos1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(pos1.lat)) *
        Math.cos(this.toRad(pos2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Sort bars by distance from a position
   */
  static sortBarsByDistance(bars: Bar[], userPosition: { lat: number; lng: number }): Bar[] {
    return bars.sort((a, b) => {
      const distA = this.calculateDistance(userPosition, a.position);
      const distB = this.calculateDistance(userPosition, b.position);
      return distA - distB;
    });
  }
}

