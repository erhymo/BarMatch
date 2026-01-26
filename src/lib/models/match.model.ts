import { Team } from './team.model';

/**
 * Match status types
 */
export type MatchStatus = 'scheduled' | 'cancelled' | 'completed';

/**
 * Match model
 * Represents a sports match/game
 */
export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time string (HH:MM)
  competition: string; // League/competition name
  status?: MatchStatus;
}

/**
 * where2watch match model
 * Extends Match with bar-specific information
 */
export interface Where2WatchMatch extends Match {
  barId: string;
  cancelledAt?: string; // ISO datetime string
}

