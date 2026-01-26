export interface Team {
  id: string;
  name: string;
  logo?: string;
}

export type MatchStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  competition: string;
  status?: MatchStatus;
}

export interface Where2WatchMatch extends Match {
  barId: string;
  cancelledAt?: string;
}

