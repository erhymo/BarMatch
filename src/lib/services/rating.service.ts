import { BarRating, UserRating, RATING_STORAGE_KEYS } from '../models';

/**
 * RatingService
 * Platform-agnostic service for managing bar ratings
 */
export class RatingService {
  /**
   * Load all bar ratings from storage
   */
  static loadRatings(storage: Storage): BarRating[] {
    try {
      const data = storage.getItem(RATING_STORAGE_KEYS.RATINGS);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load ratings:', error);
      return [];
    }
  }

  /**
   * Save all bar ratings to storage
   */
  static saveRatings(ratings: BarRating[], storage: Storage): void {
    try {
      storage.setItem(RATING_STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
    } catch (error) {
      console.error('Failed to save ratings:', error);
    }
  }

  /**
   * Get rating data for a specific bar
   */
  static getBarRating(barId: string, ratings: BarRating[]): BarRating | null {
    return ratings.find((r) => r.barId === barId) || null;
  }

  /**
   * Get user's rating for a specific bar
   */
  static getUserRatingForBar(
    userId: string,
    barId: string,
    ratings: BarRating[]
  ): UserRating | null {
    const barRating = this.getBarRating(barId, ratings);
    if (!barRating) return null;
    return barRating.ratings.find((r) => r.userId === userId) || null;
  }

  /**
   * Calculate average rating from user ratings
   */
  static calculateAverageRating(userRatings: UserRating[]): number {
    if (userRatings.length === 0) return 0;
    const sum = userRatings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / userRatings.length) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Create a new user rating
   */
  static createUserRating(userId: string, barId: string, rating: number): UserRating {
    return {
      userId,
      barId,
      rating: Math.max(1, Math.min(5, rating)), // Clamp between 1-5
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add or update a user's rating for a bar
   */
  static addOrUpdateRating(
    userId: string,
    barId: string,
    rating: number,
    allRatings: BarRating[]
  ): BarRating[] {
    const newUserRating = this.createUserRating(userId, barId, rating);
    const existingBarRatingIndex = allRatings.findIndex((r) => r.barId === barId);

    if (existingBarRatingIndex === -1) {
      // Create new bar rating
      const newBarRating: BarRating = {
        barId,
        averageRating: rating,
        totalRatings: 1,
        ratings: [newUserRating],
      };
      return [...allRatings, newBarRating];
    }

    // Update existing bar rating
    const updatedRatings = [...allRatings];
    const barRating = { ...updatedRatings[existingBarRatingIndex] };
    const existingUserRatingIndex = barRating.ratings.findIndex((r) => r.userId === userId);

    if (existingUserRatingIndex === -1) {
      // Add new user rating
      barRating.ratings = [...barRating.ratings, newUserRating];
    } else {
      // Update existing user rating
      barRating.ratings = [...barRating.ratings];
      barRating.ratings[existingUserRatingIndex] = newUserRating;
    }

    // Recalculate average
    barRating.averageRating = this.calculateAverageRating(barRating.ratings);
    barRating.totalRatings = barRating.ratings.length;

    updatedRatings[existingBarRatingIndex] = barRating;
    return updatedRatings;
  }

  /**
   * Remove a user's rating for a bar
   */
  static removeRating(userId: string, barId: string, allRatings: BarRating[]): BarRating[] {
    const barRatingIndex = allRatings.findIndex((r) => r.barId === barId);
    if (barRatingIndex === -1) return allRatings;

    const updatedRatings = [...allRatings];
    const barRating = { ...updatedRatings[barRatingIndex] };
    barRating.ratings = barRating.ratings.filter((r) => r.userId !== userId);

    if (barRating.ratings.length === 0) {
      // Remove bar rating if no ratings left
      return updatedRatings.filter((r) => r.barId !== barId);
    }

    // Recalculate average
    barRating.averageRating = this.calculateAverageRating(barRating.ratings);
    barRating.totalRatings = barRating.ratings.length;

    updatedRatings[barRatingIndex] = barRating;
    return updatedRatings;
  }

  /**
   * Get rating display text (e.g., "4.5 ★ (12)")
   */
  static getRatingDisplayText(barRating: BarRating | null): string {
    if (!barRating || barRating.totalRatings === 0) {
      return 'Ingen vurderinger';
    }
    return `${barRating.averageRating.toFixed(1)} ★ (${barRating.totalRatings})`;
  }
}

