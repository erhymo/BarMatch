export type GoingVote = {
  barId: string;
  matchId: string;
  userId: string;
  timestamp: string; // ISO datetime string
};

export type GoingStatus = {
  barId: string;
  matchId: string;
  count: number;
  isGoing: boolean;
};

export const GOING_STORAGE_KEYS = {
  VOTES: 'barmatch_going_votes_v1',
} as const;

