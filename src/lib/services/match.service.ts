import { Match, Team } from '../models';

/**
 * Match Service
 * Platform-agnostic service for match-related operations
 */

export class MatchService {
  /**
   * Extract unique leagues from matches
   */
  static getUniqueLeagues(matches: Match[]): string[] {
    const leagueSet = new Set<string>();
    matches.forEach((match) => {
      leagueSet.add(match.competition);
    });
    return Array.from(leagueSet).sort();
  }

  /**
   * Extract unique teams from matches for a specific league
   */
  static getTeamsForLeague(matches: Match[], league: string): Team[] {
    const teamMap = new Map<string, string>();

    matches
      .filter((match) => match.competition === league)
      .forEach((match) => {
        teamMap.set(match.homeTeam.id, match.homeTeam.name);
        teamMap.set(match.awayTeam.id, match.awayTeam.name);
      });

    return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }));
  }

  /**
   * Sort teams: favorites first, then alphabetically
   */
  static sortTeams(teams: Team[], favoriteTeamIds: string[]): Team[] {
    return teams.sort((a, b) => {
      const aIsFavorite = favoriteTeamIds.includes(a.id);
      const bIsFavorite = favoriteTeamIds.includes(b.id);

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Filter matches to show only upcoming (today and future)
   */
  static getUpcomingMatches(matches: Match[]): Match[] {
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];

    return matches
      .filter((match) => match.date >= todayDate)
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
  }

  /**
   * Format date to localized string
   */
  static formatDate(dateString: string, locale: string = 'no-NO'): string {
    return new Date(dateString).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  /**
   * Get today's day name
   */
  static getTodayDayName(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  /**
   * Get league emoji
   */
  static getLeagueEmoji(league: string): string {
    const emojiMap: Record<string, string> = {
      'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'La Liga': '🇪🇸',
      'Bundesliga': '🇩🇪',
      'Serie A': '🇮🇹',
      'Eliteserien': '🇳🇴',
      'Champions League': '🏆',
    };
    return emojiMap[league] || '⚽';
  }
}

