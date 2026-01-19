import { FavoritesService } from './favorites.service';
import { RatingService } from './rating.service';
import { CampaignService } from './campaign.service';
import { ChatService } from './chat.service';
import { BarRating, BarCampaign, ChatThread } from '../models';

const DEMO_BOOTSTRAP_KEY = 'barmatch_demo_bootstrap_done';

const DEMO_FAVORITE_TEAMS: string[] = ['liv', 'bar', 'vif'];
const DEMO_FAVORITE_BARS: string[] = ['1', '5', '6'];

export class DemoService {
  // Reset all app data to a clean demo state
  static resetDemoData(storage: Storage): void {
    this.clearAppData(storage);
    this.seedDemoData(storage);
  }

  // Remove all BarMatch-related keys from storage while
  // keeping the demo bootstrap flag so we don't loop reloads.
  private static clearAppData(storage: Storage): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;

        // All our namespaced keys, except the bootstrap flag
        if (key.startsWith('barmatch_') && key !== DEMO_BOOTSTRAP_KEY) {
          keysToRemove.push(key);
        }

        // Auth + per-bar cancelled matches
        if (key === 'barId' || key.startsWith('cancelledMatches_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => storage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear demo data', error);
    }
  }

  // Seed a tidy set of demo data: favorites, ratings,
  // campaigns, chat threads and cancelled matches.
  private static seedDemoData(storage: Storage): void {
    this.seedFavorites(storage);
    this.seedRatings(storage);
    this.seedCampaigns(storage);
    this.seedChat(storage);
    this.seedCancelledMatches(storage);
  }

  private static seedFavorites(storage: Storage): void {
    try {
      FavoritesService.saveFavoriteTeams(DEMO_FAVORITE_TEAMS, storage);
      FavoritesService.saveFavoriteBars(DEMO_FAVORITE_BARS, storage);
    } catch (error) {
      console.error('Failed to seed demo favorites', error);
    }
  }

  private static seedRatings(storage: Storage): void {
    try {
      const timestamp = new Date().toISOString();

      const ratings: BarRating[] = [
        {
          barId: '1',
          averageRating: 4.7,
          totalRatings: 3,
          ratings: [
            { userId: 'demo-user-1', barId: '1', rating: 5, timestamp },
            { userId: 'demo-user-2', barId: '1', rating: 4, timestamp },
            { userId: 'demo-user-3', barId: '1', rating: 5, timestamp },
          ],
        },
        {
          barId: '5',
          averageRating: 4.5,
          totalRatings: 4,
          ratings: [
            { userId: 'demo-user-1', barId: '5', rating: 5, timestamp },
            { userId: 'demo-user-4', barId: '5', rating: 4, timestamp },
            { userId: 'demo-user-5', barId: '5', rating: 5, timestamp },
            { userId: 'demo-user-6', barId: '5', rating: 4, timestamp },
          ],
        },
        {
          barId: '6',
          averageRating: 4.6,
          totalRatings: 3,
          ratings: [
            { userId: 'demo-user-2', barId: '6', rating: 5, timestamp },
            { userId: 'demo-user-3', barId: '6', rating: 4, timestamp },
            { userId: 'demo-user-7', barId: '6', rating: 5, timestamp },
          ],
        },
      ];

      RatingService.saveRatings(ratings, storage);
    } catch (error) {
      console.error('Failed to seed demo ratings', error);
    }
  }

  private static seedCampaigns(storage: Storage): void {
    try {
      const now = new Date().toISOString();

      const campaigns: BarCampaign[] = [
        {
          id: 'demo-camp-terr-1',
          barId: '5',
          text: 'Happy Hour before match - 2-for-1 on draft beer',
          tags: ['Happy Hour', '2-for-1'],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'demo-camp-terr-2',
          barId: '5',
          text: 'Burger and beer for 249,- during Premier League matches',
          tags: ['Food and drinks'],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'demo-camp-omv-1',
          barId: '1',
          text: 'Early kick-off: coffee and croissant for 149,-',
          tags: ['Breakfast', 'Early match'],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      CampaignService.saveCampaigns(campaigns, storage);
    } catch (error) {
      console.error('Failed to seed demo campaigns', error);
    }
  }

  private static seedChat(storage: Storage): void {
    try {
      const threads: ChatThread[] = [];

      // Guest conversation with Territoriet (bar 5)
      const baseThread = ChatService.createThread('5', 'Territoriet', 'user-1', 'Gjest');

      const msg1 = ChatService.createMessage(
        baseThread.id,
        'user',
        'Gjest',
        'Hei! Har dere plass til 4 personer til Liverpool-kampen pa mandag?'
      );

      const threadWithFirst = ChatService.addMessageToThread(baseThread, msg1);

      const msg2 = ChatService.createMessage(
        baseThread.id,
        'bar',
        'Territoriet',
        'Hei! Ja, vi har god plass. Vi holder av bord til dere om dere kommer 30 min for kampstart.'
      );

      const fullThread = ChatService.addMessageToThread(threadWithFirst, msg2);

      threads.push(fullThread);

      ChatService.saveThreads(threads, storage);
    } catch (error) {
      console.error('Failed to seed demo chat threads', error);
    }
  }

  private static seedCancelledMatches(storage: Storage): void {
    try {
      // One cancelled match for Territoriet to showcase AVLYST-state
      storage.setItem('cancelledMatches_5', JSON.stringify(['3']));
    } catch (error) {
      console.error('Failed to seed cancelled matches', error);
    }
  }
}
