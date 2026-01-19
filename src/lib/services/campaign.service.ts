import { BarCampaign, CAMPAIGN_STORAGE_KEYS } from '../models';

export class CampaignService {
  static loadCampaigns(storage: Storage): BarCampaign[] {
    try {
      const raw = storage.getItem(CAMPAIGN_STORAGE_KEYS.CAMPAIGNS);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as BarCampaign[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveCampaigns(campaigns: BarCampaign[], storage: Storage): void {
    try {
      storage.setItem(CAMPAIGN_STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
    } catch {
      // Ignore
    }
  }

  static getCampaignsForBar(barId: string, campaigns: BarCampaign[]): BarCampaign[] {
    return campaigns.filter((c) => c.barId === barId);
  }

  static createCampaign(barId: string, text: string, tags: string[] = []): BarCampaign {
    const now = new Date().toISOString();
    return {
      id: `camp-${barId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      barId,
      text: text.trim(),
      tags: tags.map((t) => t.trim()).filter(Boolean),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  static addCampaign(newCampaign: BarCampaign, campaigns: BarCampaign[]): BarCampaign[] {
    return [...campaigns, newCampaign];
  }

  static toggleCampaignActive(campaignId: string, campaigns: BarCampaign[]): BarCampaign[] {
    return campaigns.map((c) =>
      c.id === campaignId
        ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString() }
        : c
    );
  }

  static deleteCampaign(campaignId: string, campaigns: BarCampaign[]): BarCampaign[] {
    return campaigns.filter((c) => c.id !== campaignId);
  }
}

