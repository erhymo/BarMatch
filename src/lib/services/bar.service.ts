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
    if (!teamId) {
      return bars;
    }

    return bars.filter((bar) => {
      if (!bar.matches || bar.matches.length === 0) {
        return false;
      }

      return bar.matches.some(
        (match) => match.homeTeam.id === teamId || match.awayTeam.id === teamId
      );
    });
  }

	  /**
	   * Filter bars by match
	   * Returns bars that show the specified match
	   */
	  static filterBarsByMatch(bars: Bar[], matchId: string | null): Bar[] {
	    if (!matchId) {
	      return bars;
	    }

	    return bars.filter((bar) => {
	      if (!bar.matches || bar.matches.length === 0) {
	        return false;
	      }

	      return bar.matches.some((match) => match.id === matchId);
	    });
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
    if (!bar.matches) return [];

    const now = new Date();
    const cutoff = new Date(now.getTime() - 90 * 60 * 1000); // 1.5 hours ago

    return bar.matches
      .filter((match) => {
        const matchDateTime = new Date(`${match.date}T${match.time}`);
        return matchDateTime >= cutoff;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
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

