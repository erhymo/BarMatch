import { useState, useEffect, useCallback } from 'react';
import { BarCampaign } from '../models';
import { CampaignService } from '../services';

/**
 * React hook for managing bar campaigns/offers
 */
export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<BarCampaign[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loaded = CampaignService.loadCampaigns(localStorage);
    setCampaigns(loaded);
    setIsInitialized(true);
  }, []);

  // Persist to localStorage when campaigns change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    CampaignService.saveCampaigns(campaigns, localStorage);
  }, [campaigns, isInitialized]);

  const getCampaignsForBar = useCallback(
    (barId: string) => CampaignService.getCampaignsForBar(barId, campaigns),
    [campaigns]
  );

  const createCampaign = useCallback(
    (barId: string, text: string, tags: string[] = []) => {
      if (!text.trim()) return;
      const newCampaign = CampaignService.createCampaign(barId, text, tags);
      setCampaigns((prev) => CampaignService.addCampaign(newCampaign, prev));
    },
    []
  );

  const toggleCampaignActive = useCallback((campaignId: string) => {
    setCampaigns((prev) => CampaignService.toggleCampaignActive(campaignId, prev));
  }, []);

  const deleteCampaign = useCallback((campaignId: string) => {
    setCampaigns((prev) => CampaignService.deleteCampaign(campaignId, prev));
  }, []);

  return {
    campaigns,
    getCampaignsForBar,
    createCampaign,
    toggleCampaignActive,
    deleteCampaign,
  };
}

