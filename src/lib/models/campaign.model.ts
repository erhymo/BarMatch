export interface BarCampaign {
  id: string;
  barId: string;
  text: string; // Free text describing the offer, e.g. "Happy Hour før kamp"
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const CAMPAIGN_STORAGE_KEYS = {
  CAMPAIGNS: 'where2watch_bar_campaigns',
} as const;
